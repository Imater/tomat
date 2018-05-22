import { WebClient } from '@slack/client'

module.exports = {

	setStatus: function(status_text, status_emoji, config, cb) {

		const web = new WebClient(config.slackToken);

		web.users.profile.set({
			profile: {
				status_text,
				status_emoji
			} 
		})
			.then(function (res) {
                // `res` contains information about the posted message
				if (res.profile && res.profile.status_text !== status_text) {
					console.log('Slack status set error', res);
				}
				cb()
            })
            .catch(console.error);

	},
	setPresence: function(presence, config, cb) {

		const web = new WebClient(config.slackToken);

		web.users.setPresence({
			presence 
		})
			.then(function (res) {
				// `res` contains information about the posted message
				if (res.profile && res.profile.status_text !== status_text) {
					console.log('Slack status set error', res);
				}
				cb()
			})
			.catch(console.error);

	},
	sayTextToChannel: function (channelName, text, config, cb, ts) {

		const web = new WebClient(config.slackToken);

		web.channels.list()
			.then((res) => {
			const channel = res.channels.find(c => c.name === channelName);
			if (!channel) {
				return console.log('cant find channel')
			}
            // See: https://api.slack.com/methods/chat.postMessage
            web.chat.postMessage({ channel: channel.id, text, as_user: true, thread_ts: ts, parse: true, unfurl_links: true })
                .then((res) => {
                // `res` contains information about the posted message
                cb(res.ts)
            })
            .catch(console.error);
			
        })
        .catch(console.error);
    }
}
