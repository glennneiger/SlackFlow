/**
 * Project: SlackFlow
 * File name: observation-totals
 * Created by:  joshbenner on 5/22/18.
 *
 * Outside references:
 *
 * Purpose:
 */
"use strict";
const moment = require( "moment-timezone" );
const createCsvWriter = require( "csv-writer" ).createObjectCsvWriter;
const request = require( "request" );

const env = "dev";
const baseUrl = `http://${env}.api.growthchart.me`;
// const baseUrl = `http://localhost:2050`;


// exports.ObsCounts = ( req, res ) => {
/**
 * 7 days
 * 1 day
 * 2 hours
 */
    // TODO: Cron schedules
    // TODO: 0 5 * * *  <- Total observations for the day on Every day at midnight(offset 5 hours for timezone
    // difference) TODO: 0 5 * * 0 <- Weekly total of observations, Runs on Sunday Midnight(offset 5 hours for timezone
    // difference) TODO: 0 13-24/2 * * 1-5 <- Total Observations per center every 2 hours(7am - 6pm)(Mon-Friday)
const centers = [
        { id: "599db3113018af568f04aa74", name: "Mariposa" },
        { id: "5a4d51165a23d1572db9e851", name: "Katie's Kids" },
        { id: "5a873fb599238269b2679558", name: "PlayCare" },
        { id: "5ade4844883af15ba372d6f9", name: "Jenifer's Joyous One's" },
        { id: "5afc48ce4ad7994903bc4d0c", name: "Starlight Learning Center" },
        { id: "5afc5a6a4ad7994903bc4d27", name: "Zasty's" },
        { id: "5afb4f63c2ab2a35f0974e64", name: "Teddy Bear Totland" },
        { id: "5afe0fab4ad7994903bc4f70", name: "Holly's Little Red Wagon" },
        { id: "5b0dd8f94ad7994903bc57e1", name: "Honey Pie" },
        { id: "5b3a4007a7cb5063da2da7bb", name: "Home for Little Angels"},
        { id: "5b3a3f44a7cb5063da2da7b7", name: "Miss Susan's House"},
        { id: "5b3a3c7aa7cb5063da2da7b3", name: "Busy Bee Learning Center"},
        { id: "5b3a3c0fa7cb5063da2da7af", name: "Angela's Family Day Care"},
        { id: "5b3a3b40a7cb5063da2da7ab", name: "Special Blessings Child Care" },
        { id: "5b3a3882a7cb5063da2da79f", name: "Little Angel" },
        { id: "5b3a37f6a7cb5063da2da79b", name: "The Learning House" },
    ];

const command = process.argv[ 2 ];
const duration = process.argv[ 3 ];
const durationUnit = process.argv[ 4 ];
const channelUrl = process.argv[ 5 ];

switch ( command ) {
    case "writeAllTotalsToCSV":
        writeAllTotalsToCSV();
        break;
    case "totalsToSlack":
        totalsToSlack( duration, durationUnit );
        break;
    case "weeklyBreakdowns":
        weeklyBreakdownToSlack();
        break;
    case "weeklyBreakdownByCenterToSlack":
        weeklyBreakdownByCenterToSlack();
        break;
}

/**
 * Grabs the data from your API if desired to do comparisons
 * @param API_URL
 * @returns {Promise}
 */
function grabData( API_URL ) {
    return new Promise( function( resolve, reject ) {
        request.get( { url: API_URL, json: true }, function( err, resp ) {
            if( err ) {
                reject( "Failed to grab data" );
            }
            resolve( resp.body );
        } );
    } );
}

// grab a week's observation totals for each center
function grabCenterObservationTotal( centers, baseDate, endDate ) {
    return new Promise( ( resolve, reject ) => {
        const url = `${baseUrl}/observations/center/${centers.map( ( i ) => {
            return i.id;
        } ).join( "," )}/date/${baseDate}/${endDate}`;
        grabData( url ).then( ( results ) => {
            let csvRecords = [];
            for ( let i = 0; i < centers.length; i++ ) {
                csvRecords.push( {
                    center: results.observationsCount[ i ].name,
                    baseDate: moment( baseDate ).format( "YYYY-MM-DD" ),
                    endDate: moment( endDate ).format( "YYYY-MM-DD" ),
                    observationTotal: results.observationsCount[ i ].count
                } );
            }
            resolve( csvRecords );
        } ).catch( ( err ) => {
            console.log( `error: ${err}` );
            reject( err );
        } );
    } );
}

// grab a week's observation totals for each center
function grabCenterDailySheetTotal( centers, baseDate, endDate ) {
    return new Promise( ( resolve, reject ) => {
        const url = `${baseUrl}/emails/dailysheet/${centers.map( ( i ) => {
            return i.id;
        } ).join( "," )}/date/${baseDate}/${endDate}`;
        // Push on the promise
        grabData( url ).then( ( results ) => {
            let csvRecords = [];
            for ( let i = 0; i < centers.length; i++ ) {
                csvRecords.push( {
                    center: results.dailySheetCount[ i ].name,
                    baseDate: moment( baseDate ).format( "YYYY-MM-DD" ),
                    endDate: moment( endDate ).format( "YYYY-MM-DD" ),
                    dailySheetTotal: results.dailySheetCount[ i ].count,
                } );
            }
            resolve( csvRecords );
        } ).catch( ( err ) => {
            console.log( `error: ${err}` );
            reject( err );
        } );
    } );
}

/**
 * Loops through each center and week to write data to CSV
 */
function writeAllTotalsToCSV() {
    let observationTotalPromises = [];
    const startDate = moment( "2017-12-31" );
    for ( let baseDate = moment( startDate ), endDate = moment( baseDate ).add( 7, "day" ); baseDate.isBefore( moment() ); baseDate.add( 7, "day" ), endDate.add( 7, "day" ) ) {
        observationTotalPromises.push( grabCenterObservationTotal( centers, JSON.parse( JSON.stringify( baseDate ) ), JSON.parse( JSON.stringify( endDate ) ) ) );
    }

    Promise.all( observationTotalPromises ).then( ( results ) => {
        for ( let result of results ) {
            writeObservationTotalToCSV( result );
        }
    } );
}

/**
 * Writes weekly observation counts by center to CSV for Graphing purposes in PPT
 * @param centerObservationTotals
 */
function writeObservationTotalToCSV( centerObservationTotals ) {
    const csvWriter = createCsvWriter( {
        path: "./observation_totals.csv",
        header: [
            { id: "center", title: "Center" },
            { id: "baseDate", title: "BaseDate" },
            { id: "endDate", title: "EndDate" },
            { id: "observationTotal", title: "ObservationTotal" },
        ],
        append: true
    } );
    csvWriter.writeRecords( centerObservationTotals )       // returns a promise
        .then( () => {
            console.log( "...Done" );
        } );
}

/**
 * Grab the observation totals for the specified duration and post them to Slack
 */
function totalsToSlack() {
    const startDate = JSON.parse( JSON.stringify( moment( moment().subtract( duration, durationUnit ) ).tz( "US/Central" ).format( "YYYY-MM-DDT00:00:00.000" ) + "Z" ) );
    console.log( `Start Date: ${startDate}` );
    const endDate = JSON.parse( JSON.stringify( moment() ) );
    grabCenterObservationTotal( centers, startDate, endDate ).then( ( result ) => {
        const attachments = [];
        for ( let i = 0; i < result.length; i++ ) {
            attachments.push( formatSlackMessage( result[ i ].center, `# of Observations: ${ result[ i ].observationTotal }\n` ) );
        }
        // TODO: This is ugly but I couldn't get reduce to work
        let observationTotalAcrossCenters = 0;
        result.forEach( ( obsTotal ) => {
            observationTotalAcrossCenters += obsTotal.observationTotal;
        } );
        const message = {
            "text": `Total # of Observations over the past ${duration} ${durationUnit}s - ${observationTotalAcrossCenters}`,
            "attachments": attachments
        };
        slackMessage( channelUrl, message );
    } );
    grabCenterDailySheetTotal( centers, startDate, endDate ).then( ( result ) => {
        const attachments = [];
        for ( let i = 0; i < centers.length; i++ ) {
            attachments.push( formatSlackMessage( result[ i ].center, `# of Daily Sheets: ${ result[ i ].dailySheetTotal }\n` ) );
        }
        // TODO: This is ugly but I couldn't get reduce to work
        let dailySheetTotalAcrossCenters = 0;
        result.forEach( ( dailySheets ) => {
            dailySheetTotalAcrossCenters += dailySheets.dailySheetTotal;
        } );
        const message = {
            "text": `Total # of Daily Sheets over the past ${duration} ${durationUnit}s -
    ${dailySheetTotalAcrossCenters}`, "attachments": attachments
        };
        slackMessage( channelUrl, message );
    } );
}

/**
 * I got the automatic alias name fail and add/remove into pilot today. Which channel/how frequently do you want the
 * category breakdown and day of week breakdown
 Yeah, I saw that - very cool. I'd say let's put it in obs-totals. I think weekly is probably fine. Monthly would be good too so we can tie it to an invoice.
 Is the day of week breakdown just to see the difference on Monday vs. Friday type of thing? I think weekly in Obs-Totals is good for that too.
 */

const url = `${baseUrl}/observations/center/:centerId/date/:startDate/:endDate?category=`;

// grab a week's observation totals for each center
function grabCenterDayOfWeekObservationTotal( centers, baseDate, endDate ) {
    return new Promise( ( resolve, reject ) => {
        let dayOfWeekPromises = [];
        centers.forEach( ( center ) => {
            dayOfWeekPromises.push( grabData( `${baseUrl}/observations/center/${center.id}/dow` ) );
        } );
        Promise.all( dayOfWeekPromises ).then( ( results ) => {
            let csvRecords = [];
            for ( let i = 0; i < centers.length; i++ ) {
                csvRecords.push( {
                    dayOfWeek: results.dayOfWeekObservations[ i ].name,
                    baseDate: moment( baseDate ).format( "YYYY-MM-DD" ),
                    endDate: moment( endDate ).format( "YYYY-MM-DD" ),
                    observationTotal: results.dayOfWeekObservations[ i ].count
                } );
            }
            resolve( csvRecords );
        } ).catch( ( err ) => {
            console.log( `error: ${err}` );
            reject( err );
        } );
    } );
}

/**
 * Grabs all centers DOW breakdowns and posts to slack
 */
function weeklyBreakdownToSlack() {
    const url = `${baseUrl}/observations/center/${centers.map( ( i ) => {
        return i.id;
    } ).join( "," )}/dow/`;
    const daysOfWeek = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
    grabData( url ).then( ( results ) => {
        const dayAttachments = results.dayOfWeekObservations.map( ( x, i ) => formatSlackMessage( daysOfWeek[ i ], `# of Observations: ${ x.count }\n` ));
        const message = {
            "text": `Total # of Observations by Day of Week`,
            "attachments": dayAttachments
        };
        slackMessage( channelUrl, message );
    } ).catch( ( err ) => {
        console.log( `Failed grabbing DOW breakdown: ${err}` );
    } );
}

function weeklyBreakdownByCenterToSlack(){
    const startDate = JSON.parse( JSON.stringify( moment( moment().subtract( duration, durationUnit ) ).tz( "US/Central" ).format( "YYYY-MM-DDT00:00:00.000" ) + "Z" ) );
    console.log( `Start Date: ${startDate}` );
    const endDate = JSON.parse( JSON.stringify( moment() ) );
    grabCenterDayOfWeekObservationTotal( centers, startDate, endDate ).then( ( result ) => {
        const attachments = [];
        for ( let i = 0; i < centers.length; i++ ) {
            attachments.push( formatSlackMessage( result[ i ].center, `# of Obs Sheets: ${ result[ i ].dailySheetTotal }\n` ) );
        }
        // TODO: This is ugly but I couldn't get reduce to work
        let dailySheetTotalAcrossCenters = 0;
        result.forEach( ( dailySheets ) => {
            dailySheetTotalAcrossCenters += dailySheets.dailySheetTotal;
        } );
        const message = {
            "text": `Total # of Observations By Day of Week over the past ${duration} ${durationUnit}s -
    ${dailySheetTotalAcrossCenters}`, "attachments": attachments
        };
        slackMessage( channelUrl, message );
    } );
}

/**
 * Formats the Slack Message
 * @param title
 * @param text
 * @returns {{title: *, text: string}}
 */
function formatSlackMessage( title, text ) {
    // TODO: Add color for if this is up or down
    // const color = (intentInfo.exit_rate < intentInfo.exit_rate_historical) ? "#28a745" : "#dc3545";
    return {
        title,
        text
        // "color": color
    };
}

/**
 * Send slack message for observation data
 * @param channelUrl
 * @param message
 */
function slackMessage( channelUrl, message ) {
    request.post( channelUrl, { json: message }, function( err, resp ) {
        if( err ) {
            console.log( err );
        }
        console.log( "Successfully grabbed data" );
    } );
}


// };
