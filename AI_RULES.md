# AI Rules for AASP Application Development

This document outlines the core technologies used in the AASP application and provides clear guidelines on which libraries and tools to use for specific functionalities. Adhering to these rules ensures consistency, maintainability, and optimal performance across the codebase.

## Tech Stack Overview

*   **Frontend Framework**: React.js
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **UI Components**: shadcn/ui (built on Radix UI primitives)
*   **Routing**: React Router DOM
*   **Backend & Database**: Supabase (for authentication, database, and storage)
*   **Data Fetching & State Management**: React Query (`@tanstack/react-query`)
*   **Icons**: Lucide React
*   **Form Handling & Validation**: React Hook Form with Zod
*   **Maps**: Leaflet
*   **Notifications**: Sonner and Radix UI Toast
*   **Progressive Web App (PWA)**: Vite PWA Plugin

## Library Usage Guidelines

To maintain a consistent and efficient codebase, please follow these guidelines for library usage:

*   **UI Components**: Always use `shadcn/ui` components for all user interface elements. If a specific component is not available or requires significant customization, create a new component that wraps or extends existing `shadcn/ui` primitives, or build a new one using Tailwind CSS. **Do not modify `shadcn/ui` files directly.**
*   **Styling**: Utilize Tailwind CSS classes exclusively for all styling. Avoid inline styles or separate CSS files for components unless absolutely necessary for global styles (e.g., `src/index.css`).
*   **Routing**: Manage all client-side navigation and routing using `react-router-dom`. All primary route definitions should remain centralized in `src/App.tsx`.
*   **Backend Interactions**: All interactions with the backend, including user authentication, database queries, and file storage, must be performed using the Supabase client (`@supabase/supabase-js`) imported from `src/integrations/supabase/client.ts`.
*   **Data Fetching**: For asynchronous data fetching, caching, and synchronization with the UI, use `@tanstack/react-query`.
*   **Form Management**: Implement all forms using `react-hook-form` for state management and `zod` for schema-based validation.
*   **Icons**: Use icons from the `lucide-react` library.
*   **Notifications**: For simple, non-blocking notifications, use `sonner`. For more complex or interactive toast notifications, use the `@radix-ui/react-toast` components.
*   **Maps**: For any map-related functionalities, use the `leaflet` library.
*   **PWA**: The application is configured as a Progressive Web App (PWA) using `vite-plugin-pwa`. Ensure any new static assets are correctly included in the PWA manifest and Workbox configuration if they need to be cached for offline use.