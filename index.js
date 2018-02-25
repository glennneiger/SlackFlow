/**
 * Project: SlackFlow
 * File name: index
 * Created by:  joshbenner on 2/24/18.
 *
 * Outside references:
 *
 * Purpose:
 */
"use strict";
const request = require( "request" );
const Flowlytics = require( "flowlytics" );


/**
 * Sends your dialog flow analytics to your configured slack channels
 * @param channelsInterval
 * @param tokens
 * @param bot_name
 */
module.exports = function sendFlowlyticsToSlack( channelsInterval, bot_name, tokens ) {
    channelsInterval.forEach( function( channelObj ) {
        Flowlytics( tokens, channelObj.day ).then( function( resp ) {
            // Messages and Analytics are the returned objects from their respective calls
            const analytics = resp.analytics;
            const messages = resp.messages;

            const formatted_messages_analytics  = formatAnalyticsData(analytics);
            const formatted_analytics = formatIntentData( messages, channelObj.day, bot_name );

            // This is only synchronous because doing it async when posting formatted messages to a channel looks
            // weird.
            // Sending the analytics data which is very long makes more sense and then having the shorter messages data
            // at the bottom of the report
            sendSlackMessage( channelObj.channelUrl, formatted_analytics ).then( function( resp ) {
                sendSlackMessage( channelObj.channelUrl, formatted_messages_analytics ).then( function( res ) {
                    console.log( "Successfully sent the analytics data " );
                } ).catch(function( err ) {
                    console.log(err);
                });
            } ).catch(function( err ) {
                console.log(err);
            });
        } );
    } );
};


/**
 * Formats the Messages/Intents Collection into a digestible format for slack through the concept of attachments
 * @param analytics - the messagess object that we'll be formatting into a digestible format
 * @param day - the number of days the data was collect for
 * @param bot_name - the bot's name
 * @returns {{text: string, attachments: Array}} - the full slack message
 */
function formatIntentData( analytics, day, bot_name ) {
    const attachments = [];
    analytics.rows.forEach( function( intentInfo ) {
        const good_or_bad = intentInfo.exit_rate > intentInfo.exit_rate_historical ? ":thumbsup:" : ":thumbsdown:";
        const happy_or_sad = intentInfo.exit_rate < intentInfo.exit_rate_historical ? ":smile:" : ":cry:";
        const color = intentInfo.exit_rate < intentInfo.exit_rate_historical ? "#28a745" : "#dc3545";
        const attachment = {
            "title": intentInfo.intent,
            "text": `Sessions: ${ intentInfo.message_groups_users_count.current }\nCount: ${ intentInfo.message_groups_count.current }\nExit %: ${ (intentInfo.exit_rate * 100).toFixed( 2 ) }% ${ good_or_bad } from ${ (intentInfo.exit_rate_historical * 100).toFixed( 2 ) }${happy_or_sad}`,
            "color": color
        };
        attachments.push( attachment );
    } );
    return {
        "text": `${bot_name} Analytics for last ${day} days`,
        "attachments": attachments
    };
}


/**
 * Formats the Analytics Collection into a digestible format for slack through the concept of attachments
 * @param messages - the messages object that we'll be formatting into a digestible format
 * @returns {{text: string, color: string}}
 */
function formatAnalyticsData( analytics ) {
    const messages_per_user = analytics.average_messages_per_user.aggregated;
    const sessions_per_user = analytics.num_users.aggregated;
    const messages_up_or_down = messages_per_user.current > messages_per_user.historical ? ":thumbsup:" : ":thumbsdown:";
    const sessions_up_or_down = sessions_per_user.current > sessions_per_user.historical ? ":thumbsup:" : ":thumbsdown:";

    return {
        "text": `Average Messages Per User: ${ messages_per_user.current.toFixed( 2 ) } ${messages_up_or_down} from ${ messages_per_user.historical.toFixed( 2 ) }\nTotal Conversations: ${ sessions_per_user.current } ${sessions_up_or_down} from ${sessions_per_user.historical}`,
        "color": "#7CD197"
    };
}


/**
 * Sends the formatted slack message to the desired channel
 * @param channelUrl - the slack channel url we want to send to
 * @param message - the formatted message we're sending
 * @returns {Promise}
 */
function sendSlackMessage( channelUrl, message ) {
    return new Promise( function( resolve, reject ) {
        request.post( channelUrl, { json: message }, function( err, resp ) {
            if(err){
                reject(err);
            }
            resolve(resp);
        } );
    } );
}

