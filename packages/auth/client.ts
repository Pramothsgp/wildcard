import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// No baseURL: the browser talks to the app it was loaded from.
export const authClient = createAuthClient({ plugins: [adminClient()] });
