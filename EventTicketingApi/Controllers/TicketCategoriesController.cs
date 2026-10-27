using Microsoft.AspNetCore.Authorization;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.TicketCategories;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/ticket-categories")]
public class TicketCategoriesController(ITicketCategoriesService categoriesService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TicketCategoryDto>>> GetTicketCategories(
        [FromQuery] TicketCategoryQuery query, CancellationToken cancellationToken)
    {
        var result = await categoriesService.GetTicketCategoriesAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketCategoryDto>> GetTicketCategoryById(int id, CancellationToken cancellationToken)
    {
        var result = await categoriesService.GetTicketCategoryByIdAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<TicketCategoryDto>> CreateTicketCategory(
        [FromBody] CreateTicketCategoryDto dto, CancellationToken cancellationToken)
    {
        var result = await categoriesService.CreateTicketCategoryAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return FailureResponse(result.FailureKind, result.Errors);
        }
        var category = result.Value!;
        return CreatedAtAction(nameof(GetTicketCategoryById), new { id = category.Id }, category);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<TicketCategoryDto>> UpdateTicketCategory(
        int id, [FromBody] UpdateTicketCategoryDto dto, CancellationToken cancellationToken)
    {
        var result = await categoriesService.UpdateTicketCategoryAsync(id, dto, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<IActionResult> DeleteTicketCategory(int id, CancellationToken cancellationToken)
    {
        var result = await categoriesService.DeleteTicketCategoryAsync(id, cancellationToken);
        return result.IsSuccess ? NoContent() : FailureResponse(result.FailureKind, result.Errors);
    }
}
