const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const moment = require('moment');
moment.locale('fi');

class CalendarService {
    constructor(calendars) {
        this.calendars = calendars;
    }

    getEvents(eventCount = 1) {
        return new Promise(async(resolve, reject) => {
            try {
                const client = await this.getOAuthClient();
                const events = await this.getCurrentOrNextEvents(eventCount, client);
                resolve(events);
            } catch (err) {
                reject(err);
            }
        });
    }

    bookEvent(booker, meetingRoom, durationMinutes = 15) {
        return new Promise(async(resolve, reject) => {
            try {
                const client = await this.getOAuthClient();
                const bookingResult = await this.bookMeetingRoom(booker, meetingRoom, durationMinutes, client);
                resolve(bookingResult);
            } catch (err) {
                reject(err);
            }
        });
    }

    cancelEvent(canceller, meetingRoom) {
        return new Promise(async(resolve, reject) => {
            try {
                const client = await this.getOAuthClient();
                const cancelResult = await this.cancelMeeting(canceller, meetingRoom, client);
                resolve(cancelResult);
            } catch (err) {
                reject(err);
            }
        });
    }

    async getOAuthClient() {
        const secretPromise = fs.readFileAsync('client_secret.json');
        const tokenPromise = fs.readFileAsync('calendar-authToken.json');
        const secret = await secretPromise;
        const token = await tokenPromise;

        const credentials = JSON.parse(secret);
        const clientSecret = credentials.installed.client_secret;
        const clientId = credentials.installed.client_id;
        const redirectUrl = credentials.installed.redirect_uris[0];

        const auth = new googleAuth();
        const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        oauth2Client.credentials = JSON.parse(token);
        return oauth2Client;
    }

    async getCurrentOrNextEvents(eventCount, auth) {
        const promises = this.calendars.map(c => {
            return this.getCalendarEvents(c.name, c.id, eventCount, auth);
        }, this);

        return await Promise.all(promises).then(results => {
            return results.reduce((p, [success, result]) => {
                return success ? p.concat(result) : p;
            }, []);
        });
    }

    async getCalendarEvents(calendarName, calendarId, eventCount, auth) {
        const params = {
            auth: auth,
            calendarId: calendarId,
            timeMin: (new Date()).toISOString(),
            maxResults: eventCount,
            singleEvents: true,
            orderBy: 'startTime'
        };
        return new Promise((resolve, reject) => {
            google.calendar('v3').events.list(params, (err, response) => {
                if (err) {
                    resolve([false, 'The API (calendar.events.list) returned an error: ' + err]);
                    return;
                }

                const isPublic = (item) => item.visibility !== 'private';

                const events = response.items.map(e => {
                    return {
                        id: e.id,
                        name: calendarName,
                        start: e.start.dateTime || e.start.date,
                        end: e.end.dateTime || e.end.date,
                        summary: isPublic(e) ? e.summary : 'Private',
                        description: isPublic(e) ? e.description : 'Private',
                        attendees: isPublic(e) ? e.attendees : 'Private',
                        creator: e.creator
                    }
                });

                resolve([true, events]);
            });
        });
    }

    async bookMeetingRoom(booker, roomName, durationMinutes, auth) {
        if (!roomName)
            return Promise.resolve(`Define a room name. (${this.calendars.map(c => c.name)})`)

        const selected = this.calendars.filter(c => c.name.toUpperCase() == roomName.toUpperCase());

        if (selected.length == 0)
            return Promise.resolve(`${roomName} not found. (${this.calendars.map(c => c.name)})`)

        const [success, nextReservation] = await this.getCalendarEvents(selected[0].name, selected[0].id, 1, auth);

        if (!success)
            return Promise.resolve(`Failed to get the calendar events`);

        const start = new Date();
        const end = new Date(start.getTime() + durationMinutes * 60000);

        if (nextReservation[0]) {
            const bookStart = moment(start);
            const bookEnd = moment(end);
            const resStart = moment(new Date(nextReservation[0].start));
            const resEnd = moment(new Date(nextReservation[0].end));
            
            if (bookStart.isBetween(resStart, resEnd) || bookEnd.isBetween(resStart, resEnd))
                return Promise.resolve(`Can't book ${roomName} for ${durationMinutes} minutes at ${bookStart.format('H:mm')}. The room is already reserved from ${resStart.format('H:mm')} till ${resEnd.format('H:mm')}.`);
        }
            
        const event = {
            'summary': `${ booker.name || booker.email } - SlackBot quick booking`,
            'description': `A quick booking made from SlackBot for ${booker.name} - ${booker.email}`,
            'start': {
                'dateTime': start
            },
            'end': {
                'dateTime': end
            },
            'attendees': [{
                'email': booker.email
            }]
        };

        return new Promise((resolve, reject) => {
            google.calendar('v3').events.insert({
                'auth': auth,
                'calendarId': selected[0].id,
                'resource': event
            }, (err, response) => {
                if (err) {
                    reject(`The API (calendar.events.insert) returned an error: ${err}\ncalendarId: ${selected[0].id}\nresource: ${JSON.stringify(event, null, 4)}`);
                }
                resolve(`${selected[0].name} booked for ${durationMinutes} minutes at ${moment(start).format('H:mm')}`);
            });
        });
    }

    async cancelMeeting(canceller, roomName, auth) {
        if (!roomName)
            return Promise.resolve(`Define a room name. (${this.calendars.map(c => c.name)})`)

        const selected = this.calendars.filter(c => c.name.toUpperCase() == roomName.toUpperCase());

        if (selected.length == 0)
            return Promise.resolve(`${roomName} not found. (${this.calendars.map(c => c.name)})`);

        const [success, upcomingReservations] = await this.getCalendarEvents(selected[0].name, selected[0].id, 1, auth);
        
        if (!success)
            return Promise.resolve(`Failed to get the calendar events`);

        const cancellerReservations = upcomingReservations.filter(reservation =>
            reservation.attendees && reservation.attendees.some(a => a.email == canceller.email) &&
            reservation.description && reservation.description.includes('A quick booking made from SlackBot for'));

        if (cancellerReservations.length == 0)
            return Promise.resolve(`${canceller.email} has not made any room reservations with SlackBot - Cannot cancel`);

        return new Promise((resolve, reject) => {
            google.calendar('v3').events.delete({
                'calendarId': selected[0].id,
                'eventId': cancellerReservations[0].id,
                'auth': auth
            }, (err, response) => {
                if (err)
                    reject('The API (calendar.events.delete) returned an error: ' + err);
                resolve(`The reservation of ${selected[0].name} at ${moment(cancellerReservations[0].start).format('H:mm')} by ${canceller.email} has been cancelled`);
            });
        });
    }
}

module.exports = CalendarService;