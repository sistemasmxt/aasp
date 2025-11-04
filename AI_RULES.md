# AI Rules for AASP Application Development

This document outlines the technical stack and specific library usage guidelines to ensure consistency, maintainability, and best practices across the AASP application.

## Tech Stack Overview

*   **Frontend Framework:** React (with Vite for fast development)
*   **Language:** TypeScript (strict typing for robust code)
*   **Styling:** Tailwind CSS (utility-first for rapid UI development)
*   **UI Components:** shadcn/ui (built on Radix UI for accessible and customizable components)
*   **Routing:** React Router (for client-side navigation)
*   **Backend/Database/Auth:** Supabase (BaaS for authentication, real-time database, and serverless functions)
*   **Data Fetching/State Management:** React Query (for server state management and caching)
*   **Icons:** Lucide React (a collection of beautiful and customizable SVG icons)
*   **Validation:** Zod (TypeScript-first schema declaration and validation library)
*   **Maps:** Leaflet (an open-source JavaScript library for mobile-friendly interactive maps)
*   **Toasts:** Sonner and Radix UI Toast (for user notifications)

## Library Usage Guidelines

To maintain a consistent and efficient codebase, please adhere to the following rules when using libraries:

*   **React & TypeScript:** All new components, hooks, and utility functions **must** be written in TypeScript. Leverage React's functional components and hooks.
*   **Tailwind CSS:** All styling **must** be done using Tailwind CSS utility classes. Avoid inline styles or custom CSS files unless absolutely necessary for complex animations or third-party library overrides.
*   **shadcn/ui & Radix UI:** Utilize existing `shadcn/ui` components for UI elements. If a component needs customization beyond its props, **do not modify the `ui` component directly**. Instead, create a new component that wraps or extends the `shadcn/ui` component.
*   **React Router:** Use `react-router-dom` for all client-side routing. Keep route definitions centralized in `src/App.tsx`.
*   **Supabase:**
    *   All authentication, database interactions, and server-side logic (Edge Functions) **must** use Supabase.
    *   The Supabase client should be imported from `src/integrations/supabase/client.ts`.
    *   When creating new database tables, **always enable Row Level Security (RLS)** and define appropriate policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations to ensure data integrity and security.
    *   Edge Functions should be placed in `supabase/functions/` and follow the provided template, including CORS headers and manual JWT verification if authentication is required.
*   **Lucide React:** Use `lucide-react` for all icons in the application.
*   **React Query:** Use `@tanstack/react-query` for managing server state, including data fetching, caching, and synchronization. This helps in reducing boilerplate and improving performance.
*   **Zod:** Implement `zod` for all form and data validation to ensure data integrity and provide clear error messages.
*   **Axios / Fetch API:** For external HTTP requests (e.g., integrating with third-party APIs like ViaCEP), prefer `axios` for its robust features or the native `fetch` API for simpler requests.
*   **Sonner / Radix UI Toast:** Use these libraries for displaying user notifications. Avoid introducing other toast libraries.
*   **Leaflet:** For any map-related features, use the `leaflet` library. Ensure proper cleanup of map instances on component unmount.

## File Structure

*   **`src/pages/`**: Contains top-level page components (e.g., `Dashboard.tsx`, `Auth.tsx`).
*   **`src/components/`**: Houses reusable UI components (e.g., `Button.tsx`, `ProfileEditModal.tsx`).
*   **`src/components/admin/`**: Specific components for the admin panel.
*   **`src/components/chat/`**: Specific components for the chat interface.
*   **`src/hooks/`**: Custom React hooks (e.g., `useAuth.ts`, `useIsMobile.ts`).
*   **`src/lib/`**: Utility functions, helper modules, and validation schemas (e.g., `utils.ts`, `errorHandler.ts`, `validationSchemas.ts`).
*   **`src/integrations/supabase/`**: Supabase client configuration and type definitions.
*   **`supabase/functions/`**: Supabase Edge Functions.