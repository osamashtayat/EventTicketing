// Frontend wire contracts, reviewed 2026-10-27. See FRONTEND_API.md for permissions and rules.
export type Role = "User" | "Admin" | "EventOrganizer";
export type BookingStatus = 0 | 1 | 2; // Confirmed, PartiallyCancelled, Cancelled
export type Timestamp = string; // UTC ISO 8601; event reads may omit their UTC suffix.
export type EventDateInput = string; // MM/dd/yyyy (start midnight UTC, end includes selected day), or exact ISO timestamps.
export interface PageQuery { pageNumber?: number; pageSize?: number }
export interface Page<T> {
  items: T[]; totalCount: number; pageNumber: number; pageSize: number;
  totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
}
export interface RegisterRequest { email: string; password: string; firstName: string; lastName: string }
export interface CreateAccountRequest extends RegisterRequest { role: "Admin" | "EventOrganizer" }
export interface LoginRequest { email: string; password: string; twoFactorCode?: string; twoFactorRecoveryCode?: string }
export interface Tokens { tokenType: string; accessToken: string; expiresIn: number; refreshToken: string }
export interface CurrentUser { id: string; email: string | null; firstName: string; lastName: string; roles: Role[] }
export interface CountryWrite { name: string; shortName: string }
export interface CountrySummary extends CountryWrite { id: number }
export interface Country extends CountrySummary { venues: Venue[] }
export interface CountryQuery extends PageQuery { search?: string }
export interface VenueWrite { name: string; city: string; countryId: number; capacity: number; address?: string }
export interface Venue { id: number; name: string; city: string; countryId: number; capacity: number; address: string | null }
export interface VenueQuery extends PageQuery { search?: string; countryId?: number; city?: string }
export interface EventWrite { name: string; description?: string | null; startDate: EventDateInput; endDate: EventDateInput; capacity: number; venueId: number }
export interface Event { id: number; name: string; description: string | null; startDate: Timestamp; endDate: Timestamp; capacity: number; venueId: number; organizerId: string }
export interface EventQuery extends PageQuery { search?: string; venueId?: number; countryId?: number; city?: string; startFrom?: Timestamp; startTo?: Timestamp }
export interface TicketCategoryWrite { name: string; description?: string | null; price: number; capacity: number; eventId: number }
export interface TicketCategory { id: number; name: string; description: string | null; price: number; capacity: number; eventId: number }
export interface TicketCategoryQuery extends PageQuery { eventId?: number; search?: string; minPrice?: number; maxPrice?: number }
// PUT bodies contain every required write field plus an ID matching the route.
export type UpdateRequest<T> = T & { id: number };
export interface CreateBookingRequest { eventId: number; items: { ticketCategoryId: number; quantity: number }[] }
export interface CancelBookingRequest {
  // Omit/null for full cancellation; otherwise cumulative totals (not increments).
  items?: { bookingItemId: number; cancelledQuantity: number }[] | null;
}
export interface BookingItem {
  id: number; ticketCategoryId: number; categoryName: string; quantity: number;
  cancelledQuantity: number; unitPrice: number; remainingQuantity: number;
  originalAmount: number; cancelledAmount: number; remainingAmount: number;
}
export interface Booking {
  id: number; eventId: number; status: BookingStatus; currency: "USD"; totalAmount: number;
  createdAtUtc: Timestamp; cancelledAtUtc: Timestamp | null; items: BookingItem[];
  cancelledAmount: number; remainingAmount: number;
}
export interface EventBookingQuery extends PageQuery { status?: BookingStatus | "Confirmed" | "PartiallyCancelled" | "Cancelled" }
export interface BookingQuery extends EventBookingQuery { eventId?: number }
export interface Availability {
  ticketCategoryId: number; name: string; price: number; currency: "USD";
  capacity: number; bookedQuantity: number; availableQuantity: number;
}
export interface ApiError { code: string; description: string; isNone?: boolean }
export interface ApiProblem {
  type?: string; title?: string; status?: number; detail?: string; instance?: string; traceId?: string;
  errors?: ApiError[] | Record<string, string[]> | null;
}
// Framework-mapped account routes: email delivery/complete 2FA UX is not configured.
export interface IdentityInfo { email: string; isEmailConfirmed: boolean }
export interface IdentityInfoRequest { newEmail?: string; newPassword?: string; oldPassword?: string }
export interface TwoFactorRequest { enable?: boolean | null; twoFactorCode?: string; resetSharedKey?: boolean; resetRecoveryCodes?: boolean; forgetMachine?: boolean }
export interface TwoFactorResponse { sharedKey: string; recoveryCodesLeft: number; recoveryCodes?: string[] | null; isTwoFactorEnabled: boolean; isMachineRemembered: boolean }
