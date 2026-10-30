/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The menu pages choose their page by width, as `/todo` does (TodoRoute): the desktop pages from 768px up, the phone's
 * own pages (Phone app v2, Part 7) below it. One is mounted at a time.
 */
import React from "react";
import { useIsMobile } from "../../shell/mobileChrome";
import { ResponsesPage } from "../../responses/ResponsesPage";
import { ResponsesPhone } from "./ResponsesPhone";

export const ResponsesRoute: React.FC<React.ComponentProps<typeof ResponsesPage>> = (props) =>
  useIsMobile() ? <ResponsesPhone /> : <ResponsesPage {...props} />;
