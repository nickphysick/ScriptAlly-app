/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `/agents` and `/agents/discover` choose their page by width, as `/todo` does (TodoRoute): the desktop pages from
 * 768px up, the phone's Agents tab (Phone app v2, Part 6) below it. One is mounted at a time.
 */
import React from "react";
import { useIsMobile } from "../../shell/mobileChrome";
import { Agents } from "../../Agents";
import { DiscoverPage } from "../discover1/DiscoverPage";
import { DiscoverPhone } from "./AgentsPhone";
import { AgentsV3 } from "../../phone/v3/AgentsV3";

export const AgentsRoute: React.FC<React.ComponentProps<typeof Agents>> = (props) =>
  /* Phone app v3: below 768px the Agents tab (AgentsV3); at 768px and up the Contact list, unchanged */
  useIsMobile() ? <AgentsV3 /> : <Agents {...props} />;

export const DiscoverRoute: React.FC<React.ComponentProps<typeof DiscoverPage>> = (props) =>
  useIsMobile() ? <DiscoverPhone /> : <DiscoverPage {...props} />;
