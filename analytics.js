/**
 * Project: SlackFlow
 * File name: analytics
 * Created by:  joshbenner on 2/25/18.
 *
 * Outside references:
 *
 * Purpose:
 */
"use strict";

// Array of days and slack channel URLs to post into
const channelsInterval = [
    {
        channelUrl: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK_URL",
        day: 1
    },
    {
        channelUrl: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK_URL",
        day: 7
    },
    {
        channelUrl: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK_URL",
        day: 30
    }
];

const tokens = {
    "xsrf": "YOUR_XSRF_TOKEN",
    "user_agent": "YOUR_USER_AGENT",
    "cookie": "YOUR_COOKIE_HERE",
    // Make sure this starts with 'Bearer'
    "auth": "YOUR_AUTH_TOKEN",
};

require( "slackflow" )( channelsInterval, "YOUR_APP_NAME", tokens );
