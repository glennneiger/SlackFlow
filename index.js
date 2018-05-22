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
const moment = require( "moment-timezone" );


/**
 * Sends your dialog flow analytics to your configured slack channels
 * @param channelsInterval
 * @param tokens
 * @param bot_name
 */
class SlackFlow {

    constructor( channelsInterval, bot_name, tokens ) {
        this.channelsInterval = channelsInterval;
        this.bot_name = bot_name;
        this.tokens = tokens;
    }

    sendFlowlyticsToSlack() {
        var that = this;
        this.channelsInterval.forEach( function( channelObj ) {
            Flowlytics( that.tokens, channelObj.day ).then( function( resp ) {
                // Messages and Analytics are the returned objects from their respective calls
                const analytics = resp.analytics;
                const messages = resp.messages;

                if( channelObj.day === 1 ) {
                    const url = "test.api.growthchart.me";
                    const intents_url = `http://${url}/analytics/intents/`;
                    const analytics_url = `http://${url}/analytics/conversation/`;

                    // Gotta grab 2 days ago data
                    const todayAtMidnight = moment().tz( "US/Central" ).subtract( 2, "days" ).format( "YYYY-MM-DDT00:00:00.000" ) + "Z";
                    // const todayAtMidnight = "2018-03-09T00:00:00Z";
                    console.log( `today at midnight: ${todayAtMidnight}` ); // save the data, and grab the previous days
                    const promises = [ that.saveData( intents_url, messages ), that.saveData( analytics_url, analytics ), that.grabData( `${intents_url}?date=${todayAtMidnight}` ), that.grabData( `${analytics_url}?date=${todayAtMidnight}` ) ];

                    Promise.all( promises ).then( function( results ) {
                        const formatted_analytics = that.formatIntentData( messages, channelObj.day, that.bot_name, results[ 2 ] );
                        const formatted_messages_analytics = that.formatAnalyticsData( analytics );
                        that.sendSlackAnalyticsMessages( channelObj, formatted_analytics, formatted_messages_analytics );
                    } );
                }
                // else {
                //     const formatted_analytics = this.formatIntentData( messages, channelObj.day, bot_name );
                //     const formatted_messages_analytics = this.formatAnalyticsData( analytics );
                //     this.sendSlackAnalyticsMessages(channelObj, formatted_analytics,formatted_messages_analytics);
                // }
            } ).catch( ( err ) => {
                console.log( err );
            } );
        } );
    }

    /**
     * Saves the Data to your API Endpoint
     * @param API_URL
     * @param data
     * @returns {Promise}
     */
    saveData( API_URL, data ) {
        return new Promise( function( resolve, reject ) {
            data.intents = data.rows;
            request.post( API_URL, { json: data }, function( err, resp ) {
                if( err ) {
                    reject( "Failed to save data" );
                }
                resolve( resp );
            } );
        } );
    }

    /**
     * Grabs the data from your API if desired to do comparisons
     * @param API_URL
     * @returns {Promise}
     */
    grabData( API_URL ) {
        return new Promise( function( resolve, reject ) {
            request.get( { url: API_URL, json: true }, function( err, resp ) {
                if( err ) {
                    reject( "Failed to grab data" );
                    console.log();
                }
                resolve( resp.body );
            } );
        } );
    }

    /**
     *
     * @param intentInfo
     * @param good_or_bad
     * @param happy_or_sad
     * @returns {{title: string, text: string, color: string}}
     */
    formatIntentDataWithoutPrevDay( intentInfo, good_or_bad, happy_or_sad ) {
        const color = (intentInfo.exit_rate < intentInfo.exit_rate_historical) ? "#28a745" : "#dc3545";
        const attachment = {
            "title": intentInfo.intent,
            "text": `Sessions: ${ intentInfo.message_groups_users_count.current }\nCount: ${ intentInfo.message_groups_count.current }\nExit %: ${ (intentInfo.exit_rate * 100).toFixed( 2 ) }% ${ good_or_bad } from ${ (intentInfo.exit_rate_historical * 100).toFixed( 2 ) }${happy_or_sad}`,
            "color": color
        };
        return attachment;
    }

    /**
     * /**
     * Formats the Messages/Intents Collection into a digestible format for slack through the concept of attachments
     * @param analytics - the messagess object that we'll be formatting into a digestible format
     * @param day - the number of days the data was collect for
     * @param bot_name - the bot's name
     * @param prev_days_intent_data
     * @returns {{text: string, attachments: Array}}
     */
    formatIntentData( analytics, day, bot_name, prev_days_intent_data = null ) {
        const attachments = [];
        analytics.rows.forEach( function( intentInfo ) {
            const good_or_bad = intentInfo.exit_rate > intentInfo.exit_rate_historical ? ":thumbsup:" : ":thumbsdown:";
            const happy_or_sad = intentInfo.exit_rate < intentInfo.exit_rate_historical ? ":smile:" : ":cry:";
            if( prev_days_intent_data !== null ) {
                console.log( "today data: ", JSON.stringify( analytics ) );
                console.log( "yesterday data: ", JSON.stringify( prev_days_intent_data ) );
                const prev_day_intent = prev_days_intent_data.intents.intents.find( function( obj ) {
                    return obj.intent === intentInfo.intent;
                } );
                if( prev_day_intent === undefined ) {
                    attachments.push( this.formatIntentDataWithoutPrevDay( intentInfo, good_or_bad, happy_or_sad ) );
                } else {
                    const sessions_up_or_down = intentInfo.message_groups_users_count.current > prev_day_intent.message_groups_users_count.current ? ":thumbsup:" : ":thumbsdown:";
                    const count_up_or_down = intentInfo.message_groups_count.current > prev_day_intent.message_groups_count.current ? ":thumbsup:" : ":thumbsdown:";
                    const color = ( (intentInfo.exit_rate < intentInfo.exit_rate_historical)
                    + (intentInfo.message_groups_users_count.current > prev_day_intent.message_groups_users_count.current)
                    + (intentInfo.message_groups_count.current > prev_day_intent.message_groups_count.current) >= 2)
                        ? "#28a745" : "#dc3545";
                    const attachment = {
                        "title": intentInfo.intent,
                        "text": `Sessions: ${ intentInfo.message_groups_users_count.current } ${sessions_up_or_down} from ${prev_day_intent.message_groups_users_count.current}\nCount: ${ intentInfo.message_groups_count.current } ${count_up_or_down} from ${prev_day_intent.message_groups_count.current} \nExit %: ${ (intentInfo.exit_rate * 100).toFixed( 2 ) }% ${ good_or_bad } from ${ (intentInfo.exit_rate_historical * 100).toFixed( 2 ) }${happy_or_sad}`,
                        "color": color
                    };
                    attachments.push( attachment );
                }
            } else {
                attachments.push( this.formatIntentDataWithoutPrevDay( intentInfo, good_or_bad, happy_or_sad ) );
            }
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
    formatAnalyticsData( analytics ) {
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
     * This is only synchronous because doing it async when posting formatted messages to a channel
     * looks weird. Sending the analytics data which is very long makes more sense and then having the
     * shorter messages data at the bottom of the report
     * @param channelObj
     * @param formatted_analytics
     * @param formatted_messages_analytics
     */
    sendSlackAnalyticsMessages( channelObj, formatted_analytics, formatted_messages_analytics ) {
        this.sendSlackMessage( channelObj.channelUrl, formatted_analytics
        ).then( function( resp ) {
            this.sendSlackMessage( channelObj.channelUrl, formatted_messages_analytics
            ).then( function( res ) {
                console.log( "Successfully sent the analytics data " );
            } ).catch(
                function( err ) {
                    console.log( err );
                } );
        } ).catch( function( err ) {
            console.log( err );
        } );
    }

    /**
     * Sends the formatted slack message to the desired channel
     * @param channelUrl - the slack channel url we want to send to
     * @param message - the formatted message we're sending
     * @returns {Promise}
     */
    sendSlackMessage( channelUrl, message ) {
        return new Promise( function( resolve, reject ) {
            request.post( channelUrl, { json: message }, function( err, resp ) {
                if( err ) {
                    reject( err );
                }
                resolve( resp );
            } );
        } );
    }
}

module.exports = SlackFlow;



