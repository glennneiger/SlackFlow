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
const slackflow = require( "./index" )

// Array of days and slack channel URLs to post into
const channelsInterval = [
    {
        channelUrl: "https://hooks.slack.com/services/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",
        day: 1
    },
    {
        channelUrl: "https://hooks.slack.com/services/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",
        day: 7
    },
    {
        channelUrl: "https://hooks.slack.com/services/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",
        day: 30
    }
];

// Tokens for grabbing Dialogflow Analytics data
const tokens = {
    "xsrf": "61fa89d0-18bc-4110-b7dc-ef7809845bbb",
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36",
    "cookie": "_ga=GA1.2.3954341.1507907792; _gid=GA1.2.1780631327.1521434206; zUserAccessToken=e29c93a3-8391-4418-9fe0-a4f1ccb90c2c; _gat_gtag_UA_98266305_2=1; _gat_gtag_UA_98266305_8=1",
    // Make sure this starts with 'Bearer'
    "auth": "Bearer b2e9d1c2-8fc9-4b83-8a00-5d3347ef43db",
};

const SlackFlow = new slackflow(channelsInterval, "GrowthChart", tokens);
SlackFlow.sendFlowlyticsToSlack();