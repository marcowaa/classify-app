# Frontend Route Inventory

Source: client/src/App.tsx

| Route | Module | Access Channel | Notes |
|---|---|---|---|
| / | Onboarding/Auth | decision/auth | Line 245 |
| /about | Public | public | Line 344 |
| /acceptable-use | Public | public | Line 359 |
| /accessibility | Public | public | Line 335 |
| /admin | Admin | admin | Line 286 |
| /admin-dashboard | Admin | admin | Line 289 |
| /admin/purchases | Admin | admin | Line 368 |
| /age-gate | Onboarding/Auth | decision/auth | Line 248 |
| /assign-task | Parent | parent | Line 314 |
| /auth/oauth-callback | Onboarding/Auth | decision/auth | Line 258 |
| /child-discover | Child | child/trial | Line 310 |
| /child-games | Child | child/trial | Line 298 |
| /child-gifts | Child | child/trial | Line 300 |
| /child-link | Child | child/trial | Line 261 |
| /child-notifications | Child | child/trial | Line 301 |
| /child-profile | Child | child/trial | Line 305 |
| /child-progress | Child | child/trial | Line 303 |
| /child-public-profile/:shareCode | Child | child/trial | Line 306 |
| /child-rewards | Child | child/trial | Line 302 |
| /child-safety | Child | child/trial | Line 353 |
| /child-settings | Child | child/trial | Line 309 |
| /child-store | Child | child/trial | Line 299 |
| /child-tasks | Child | child/trial | Line 304 |
| /contact | Public | public | Line 347 |
| /cookie-policy | Public | public | Line 350 |
| /create-task | Parent | parent | Line 311 |
| /delete-account | Public | public | Line 341 |
| /download | Onboarding/Auth | decision/auth | Line 252 |
| /forgot-password | Onboarding/Auth | decision/auth | Line 295 |
| /legal | Public | public | Line 362 |
| /library-store | Library | public | Line 378 |
| /library/:id | Library | public | Line 405 |
| /library/dashboard | Library | public | Line 374 |
| /library/login | Library | public | Line 371 |
| /match3 | Public | public | Line 381 |
| /memory-match | Public | public | Line 384 |
| /notifications | Parent | parent | Line 280 |
| /otp | Onboarding/Auth | decision/auth | Line 292 |
| /parent-auth | Parent | parent | Line 255 |
| /parent-dashboard | Parent | parent | Line 267 |
| /parent-inventory | Parent | parent | Line 274 |
| /parent-profile | Parent | parent | Line 408 |
| /parent-store | Parent | parent | Line 270 |
| /parent-tasks | Parent | parent | Line 320 |
| /privacy | Public | public | Line 329 |
| /privacy-policy | Public | public | Line 332 |
| /refund-policy | Public | public | Line 356 |
| /register | Onboarding/Auth | decision/auth | Line 251 |
| /school/:id | School | public | Line 399 |
| /school/dashboard | School | public | Line 390 |
| /school/login | School | public | Line 387 |
| /settings | Public | public | Line 365 |
| /store/libraries | Library | public | Line 377 |
| /subject-tasks | Public | public | Line 317 |
| /subjects | Parent | parent | Line 283 |
| /task-cart | Parent | parent | Line 326 |
| /task-marketplace | Parent | parent | Line 323 |
| /teacher/:id | School | public | Line 402 |
| /teacher/dashboard | School | public | Line 396 |
| /teacher/login | School | public | Line 393 |
| /terms | Public | public | Line 338 |
| /trial-games | Child | child/trial | Line 264 |
| /wallet | Parent | parent | Line 277 |

## Module Groups

- Onboarding/Auth: routing that decides trial vs parent auth.
- Parent: authenticated parent experience.
- Child: child and trial gameplay experience.
- Admin: admin operator surfaces.
- Library/School: partner channels.
