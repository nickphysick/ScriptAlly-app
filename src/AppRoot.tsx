/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The whole app's root (split v1, phase 4): App, then index.css — the same two imports in the same
 * order main.tsx used to make. ⚠️ THE ORDER IS THE CASCADE: App's component sheets are emitted
 * before index.css, so moving the stylesheet import above App reorders every equal-specificity rule
 * in the app.
 */
import App from "./App.tsx";
import "./index.css";

export default App;
