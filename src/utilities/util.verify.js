const config = require('../../configs/config.json');
const log = require('debug')('util.verify');

const oops = 'Oops, there was a mistake. ' +
  'This bot is not properly configured! ' +
  'Please contact the server admin.';

module.exports = {
  /**
   * Gets a verification for a client command.
   * Asks the client to verify the command by pressing either an
   * accept or cancel emoji. If accepted, executes the callback.
   */
  verifyCommand: (Message, verifyMessage, callback) => {
    new Promise((resolve, reject) => {
      try {
        Message
          .reply(`${verifyMessage}\n\nPress 👍 to accept or 👎 to cancel.`)
          .then((ReactMessage) => {
            ReactMessage
            .react('👍')
            .then(() => {
              ReactMessage
              .react('👎')
              .then(() => {
                const userId = Message.author.id;
                const filter = (reaction, user) => (reaction.emoji.name === '👍' || reaction.emoji.name === '👎') &&
                  user.id === userId;
                const collector = ReactMessage.createReactionCollector(filter, { time: 10000 });
                collector.on('collect', (r) => {
                  if (r.emoji.name === '👍') {
                    collector.stop();
                    ReactMessage.delete();
                    resolve(true, null);
                  } else {
                    collector.stop();
                    ReactMessage.delete();
                    resolve(false, ReactMessage);
                  }
                });
              })
            })
            
          });
      } catch (e) {
        reject(e);
      }
    })
    .then((decision) => {
      if (decision) {
        callback(decision)
      }
    })
    .catch((e) => {
      log('Error logged!', e);
    });
  },

  /**
   * Verifies the client with a captcha.
   * This is the main feature of the bot.
   */
  verifyClient: (GuildMember, kick = true) => {
    try {
      if (GuildMember) {
        const { user, guild } = GuildMember;
        user.createDM()
          .then((DMChannel) => {
            DMChannel
              .send(
                `Hello and welcome to ${guild.name}!\n\n` +
                'Before you can participate, you must verify that you are not a bot.\n' +
                'To verify, all you need to do is click the 👌 -emoji below.'
              )
              .then((VerifyMessage) => {
                VerifyMessage
                  .react('👌')
                  .then(() => {
                    const filter = (r, u) => r.emoji.name === '👌' &&
                      u.id === user.id;
                    const collector = VerifyMessage.createReactionCollector(
                      filter,
                      { time: config.timeToVerifyInMs }
                    );
                    collector.on('collect', (r) => {
                      collector.stop();
                    });
                    collector.on('end', (r) => {
                      if (r.size === 1) {
                        const { guilds } = config;
                        if (
                          guilds &&
                          guilds[guild.id] &&
                          guilds[guild.id].verificationRoleId
                        ) {
                          const roleId = guilds[guild.id].verificationRoleId;
                          const role = guild.roles.find(r => String(r.id) === String(roleId));
                          if (role) {
                            GuildMember
                            .addRole(role, 'Verified human.')
                            .then(() => {
                              DMChannel.send('Thanks, human!');
                            });
                          } else {
                            log('Invalid bot configuration! Role not found.');
                            DMChannel.send(oops);
                          }
                        } else {
                          log('Invalid bot configuration! Verification role id not found!');
                          DMChannel.send(oops);
                        }
                      } else {
                        DMChannel.send(
                          'I\'m sorry but the verification has failed. ' +
                          'Feel free to join the server again, if you think there ' +
                          'was a mistake.'
                        );
                        if (kick && GuildMember.kickable) {
                          log(`Kicked ${GuildMember.user.username}.`);
                          GuildMember.kick('Failed verification!');
                        }
                      }
                    });
                  });
              });
          });
      }
    } catch (e) {
      log(e);
    }
  },
};
