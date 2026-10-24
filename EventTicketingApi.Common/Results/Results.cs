namespace EventTicketingApi.Common.Results;

public readonly record struct Error(string Code, string Description)
{
    public static readonly Error None = new("", "");

    public bool IsNone => string.IsNullOrEmpty(Code);
}

public enum FailureKind
{
    None,
    Failure,
    Validation,
    NotFound,
    Conflict
}

public sealed class Result
{
    public bool IsSuccess => FailureKind == FailureKind.None;
    public FailureKind FailureKind { get; }
    public IReadOnlyList<Error> Errors { get; }

    private Result(FailureKind failureKind, Error[] errors)
    {
        ArgumentNullException.ThrowIfNull(errors);
        FailureKind = failureKind;
        Errors = Array.AsReadOnly(errors.ToArray());
    }

    public static Result Success() => new(FailureKind.None, []);
    public static Result Failure(params Error[] errors) => new(FailureKind.Failure, errors);
    public static Result NotFound(params Error[] errors) => new(FailureKind.NotFound, errors);
    public static Result BadRequest(params Error[] errors) => new(FailureKind.Validation, errors);
    public static Result Conflict(params Error[] errors) => new(FailureKind.Conflict, errors);

    // Aggregate errors while retaining the first failure's category.
    public static Result Combine(params Result[] results)
    {
        ArgumentNullException.ThrowIfNull(results);
        foreach (var result in results)
        {
            ArgumentNullException.ThrowIfNull(result);
        }

        var failures = results.Where(result => !result.IsSuccess).ToArray();
        return failures.Length == 0
            ? Success()
            : new Result(failures[0].FailureKind,
                failures.SelectMany(result => result.Errors).ToArray());
    }
}

public sealed class Result<T>
{
    public bool IsSuccess => FailureKind == FailureKind.None;
    public FailureKind FailureKind { get; }
    public T? Value { get; }
    public IReadOnlyList<Error> Errors { get; }

    private Result(FailureKind failureKind, T? value, Error[] errors)
    {
        ArgumentNullException.ThrowIfNull(errors);
        FailureKind = failureKind;
        Value = value;
        Errors = Array.AsReadOnly(errors.ToArray());
    }

    public static Result<T> Success(T value)
    {
        ArgumentNullException.ThrowIfNull(value);
        return new(FailureKind.None, value, []);
    }

    public static Result<T> Failure(params Error[] errors) => new(FailureKind.Failure, default, errors);
    public static Result<T> NotFound(params Error[] errors) => new(FailureKind.NotFound, default, errors);
    public static Result<T> BadRequest(params Error[] errors) => new(FailureKind.Validation, default, errors);
    public static Result<T> Conflict(params Error[] errors) => new(FailureKind.Conflict, default, errors);

    public Result<K> Map<K>(Func<T, K> mapFunc)
    {
        ArgumentNullException.ThrowIfNull(mapFunc);
        return IsSuccess
            ? Result<K>.Success(mapFunc(Value!))
            : new Result<K>(FailureKind, default, Errors.ToArray());
    }

    public Result<K> Bind<K>(Func<T, Result<K>> bindFunc)
    {
        ArgumentNullException.ThrowIfNull(bindFunc);
        if (!IsSuccess)
        {
            return new Result<K>(FailureKind, default, Errors.ToArray());
        }

        return bindFunc(Value!)
            ?? throw new InvalidOperationException("The binding function must return a result.");
    }

    public Result<T> Ensure(Func<T, bool> predicate, Error error)
    {
        ArgumentNullException.ThrowIfNull(predicate);
        return IsSuccess && !predicate(Value!) ? BadRequest(error) : this;
    }
}
