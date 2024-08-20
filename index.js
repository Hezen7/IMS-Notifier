const { Client, Intents } = require('discord.js');
const path = require('path');
const fs = require('fs');


let config;
try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, './config.json'), 'utf8'));
} catch (error) {
    return; 
}


const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES
    ],
    partials: ['CHANNEL']
});

const botToken = config.discord.botToken;
const userId = config.discord.userId; 
const zoneNames = config.zones; 
const language = config.language; 
const resetTime = config.resetTime;

let lastMemberList = '';
let zoneMessage = '';
let memberQueue = [];
let lastUnk2 = null;

client.once('ready', () => {
    console.log(`Discord bot for IMS-Notify Connected : ${client.user.tag}`);
});

client.login(botToken);

module.exports = function ImNotifier(dispatch) {
    function getLocalizedMessage(key) {
        const messages = {
            "en": {
                "group_found": "Group found in : ",
                "members": "Group members: "
            },
            "fr": {
                "group_found": "Groupe trouvé dans : ",
                "members": "Membres du groupe : "
            },
            "es": {
                "group_found": "Grupo encontrado en : ",
                "members": "Miembros del grupo: "
            },
            "de": {
                "group_found": "Gruppe gefunden in : ",
                "members": "Gruppenmitglieder: "
            },
            "ru": {
                "group_found": "Группа найдена в : ",
                "members": "Участники группы: "
            }
        };
        return messages[language][key];
    }

    function resetState() {
        setTimeout(() => {
            zoneMessage = '';
            memberQueue = [];
        }, resetTime);
    }

    dispatch.hook('S_FIN_INTER_PARTY_MATCH', 1, (event) => {
        const zoneId = event.zone;
        zoneMessage = `${getLocalizedMessage('group_found')} ${zoneNames[zoneId] || `Zone inconnue (${zoneId})`}`;
   
        if (memberQueue.length > 0) {
            const memberNames = memberQueue.join(', ');
            sendDiscordMessage(zoneMessage + '\n' + getLocalizedMessage('members') + memberNames);
            memberQueue = [];
        }

        resetState();
    });

    dispatch.hook('S_PARTY_MEMBER_LIST', 7, (event) => {
        const unk2 = event.unk2;

        const memberNames = event.members.map(member => member.name).join(', ');

        if (!zoneMessage) {
            memberQueue = memberNames.split(', ');
            return;
        }

        if (memberNames === lastMemberList) {
            return;
        }

        if (unk2 === lastUnk2) {
            return;
        }

        lastUnk2 = unk2;

        lastMemberList = memberNames;
        sendDiscordMessage(zoneMessage + '\n' + getLocalizedMessage('members') + memberNames);

        resetState();
    });

    function sendDiscordMessage(message) {
        if (!zoneMessage || !message) {
            return;
        }

        client.users.fetch(userId)
            .then(user => user.send(message))
            .catch(error => console.error('IMS-notify send message error :', error));
    }
};