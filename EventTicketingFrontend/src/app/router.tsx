import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PublicLayout } from './layout/PublicLayout';
import { EventDiscoveryPage } from './pages/EventDiscoveryPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import {
  CountriesPage,
  CountryDetailsPage,
  VenuesPage,
  VenueDetailsPage,
} from './pages/DirectoryPages';
import { SignInPage, RegisterPage, AccountPage } from './pages/AuthPages';
import { SessionGate } from '../features/auth/public';
import { MyBookingsPage, BookingDetailsPage } from './pages/BookingPages';
import { ManagementLayout } from './layout/ManagementLayout';
import { Loading } from '../components/ui/Feedback';
const ManageCountriesPage = lazy(() => import('./pages/manage/CountriesPage'));
const ManageVenuesPage = lazy(() => import('./pages/manage/VenuesPage'));
const ManageEventsPage = lazy(() => import('./pages/manage/EventsPage'));
const EventCreatePage = lazy(() => import('./pages/manage/EventCreatePage'));
const EventWorkspacePage = lazy(() => import('./pages/manage/EventWorkspacePage'));
const AccountCreatePage = lazy(() => import('./pages/manage/AccountCreatePage'));
export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventDiscoveryPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/countries" element={<CountriesPage />} />
          <Route path="/countries/:countryId" element={<CountryDetailsPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/venues/:venueId" element={<VenueDetailsPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/account"
            element={
              <SessionGate>
                <AccountPage />
              </SessionGate>
            }
          />
          <Route
            path="/bookings"
            element={
              <SessionGate>
                <MyBookingsPage />
              </SessionGate>
            }
          />
          <Route
            path="/bookings/:bookingId"
            element={
              <SessionGate>
                <BookingDetailsPage />
              </SessionGate>
            }
          />
          <Route
            path="/manage"
            element={
              <SessionGate roles={['Admin', 'EventOrganizer']}>
                <ManagementLayout />
              </SessionGate>
            }
          >
            <Route
              path="events"
              element={
                <Suspense fallback={<Loading />}>
                  <ManageEventsPage />
                </Suspense>
              }
            />
            <Route
              path="events/new"
              element={
                <Suspense fallback={<Loading />}>
                  <EventCreatePage />
                </Suspense>
              }
            />
            <Route
              path="events/:eventId"
              element={
                <Suspense fallback={<Loading />}>
                  <EventWorkspacePage />
                </Suspense>
              }
            />
            <Route
              path="accounts/new"
              element={
                <SessionGate roles={['Admin']}>
                  <Suspense fallback={<Loading />}>
                    <AccountCreatePage />
                  </Suspense>
                </SessionGate>
              }
            />
            <Route
              path="countries"
              element={
                <SessionGate roles={['Admin']}>
                  <Suspense fallback={<Loading />}>
                    <ManageCountriesPage />
                  </Suspense>
                </SessionGate>
              }
            />
            <Route
              path="venues"
              element={
                <SessionGate roles={['Admin']}>
                  <Suspense fallback={<Loading />}>
                    <ManageVenuesPage />
                  </Suspense>
                </SessionGate>
              }
            />
          </Route>
          <Route
            path="*"
            element={
              <div className="container">
                <h1 tabIndex={-1}>Page unavailable</h1>
                <a href="/events">Explore events</a>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
