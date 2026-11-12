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
import { AgentsV4 } from "../../phone/v4/AgentsV4";

export const AgentsRoute: React.FC<React.ComponentProps<typeof Agents>> = (props) =>
  /* Phone app v4: below 768px the Agents tab (AgentsV4); at 768px and up the Contact list, unchanged.
     Phone app v5: on a phone `/agents` lands on Today's Agents tab, which renders AgentsV4's body itself, so this slot
     draws it only if it is ever on screen (a second copy, hidden, would only double the page). */
  useIsMobile() ? (props.active ? <AgentsV4 /> : null) : <Agents {...props} />;

export const DiscoverRoute: React.FC<React.ComponentProps<typeof DiscoverPage>> = (props) =>
  useIsMobile() ? <DiscoverPhone /> : <DiscoverPage {...props} />;
