// src/modules/auth/index.js

/**
 * Public interface of the auth module.
 * Other modules import from here, not from internal files directly.
 *
 * Why? If you rename auth.routes.js, only this file changes,
 * not every file that imports it.
 */
export { authRouter } from "./auth.routes.js";
export { UserModel } from "./auth.model.js";
export { authService } from "./auth.service.js";