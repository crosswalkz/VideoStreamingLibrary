# Constants and shared values

When the same constant (e.g. max length, max file size, limit values) is used in more than one file, define it once in a global constants file and import it where needed. Do not duplicate the value across modules.

- Prefer a dedicated file for shared constants (e.g. `src/config/constants.ts` or `src/constants.ts`).
- Keep route- or feature-specific constants (e.g. API contract objects used only in one middleware) in the same file or feature folder where they are used.
- Only promote a constant to the global file when it is actually reused in multiple places.
