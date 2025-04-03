const Discord = require('discord.js');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const csv = require('csv-parser');
const croncrom = require('node-cron');
process.env.TZ = 'Asia/Kolkata';
const nodemailer = require('nodemailer');
const os = require('os');

//data acccess code guild
const guildPath = path.join(__dirname, 'mydb', 'guild.csv');
const guildData = fs.readFileSync(guildPath, 'utf8');
//data access code pass
const passPath = path.join(__dirname, 'mydb', 'pass.csv');
const passdata = fs.readFileSync(passPath, 'utf8');

//garph data
const graphPath = path.join(__dirname, 'data', 'pass.csv');



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ffguildmahadev@gmail.com',
    pass: 'twxb gtqb fgbu aqdp'
  }
});

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.DirectMessageTyping
  ]
});
const filePath = guildPath;
require('dotenv').config();
const authJson = require('./auth.json');
const status = require('./status.json');

const token = process.env.token;
const authid = authJson.authIds;

const limit = process.env.limit;

//USE FOR SEND NMESS I AM ONLINE 
client.on('ready', async () => {
  console.log('Bot is ready!');
  const channel = client.channels.cache.get(authJson.pvtcmd);
  if (channel) {
    channel.send('I am online!');
  } else {
    console.log('Channel not found!');
  }
});

// SEND CONSOLE DATA TO DISCORD

//RTD ACC
client.on('ready', () => {
  const updatePlayers = () => {
    let totalPlayers = 0;
    let bannedPlayers = 0;
    const data = fs.readFileSync(filePath, 'utf8').split('\n');
    const headers = data[0].split(',');
    const columns = {
      'UID': headers.findIndex(header => header.trim().toLowerCase() === 'uid'),
      'PLAYER NAME': headers.findIndex(header => header.trim().toLowerCase() === 'player name'),
      'RANK': headers.findIndex(header => header.trim().toLowerCase() === 'rank'),
      'STATUS': headers.findIndex(header => header.trim().toLowerCase() === 'status'),
      'KICKED SCORE': headers.findIndex(header => header.trim().toLowerCase() === 'kicked score'),
    };
    data.slice(1).forEach((row) => {
      const rowData = row.split(',');
      if (rowData.length > columns['STATUS'] && rowData[columns['STATUS']].trim().toLowerCase() === 'in guild') {
        totalPlayers++;
      }
      if (rowData.length > columns['KICKED SCORE'] && rowData[columns['KICKED SCORE']].trim() >= 10) {
        bannedPlayers++;
      }
    });

    if (status.activityStatus[0] === "false") {
      client.user.setActivity({
        name: 'Bot is currently in localhost server Dont use sensitive commands',
        type: 2
      });
    } else {
      client.user.setActivity({
        name: `GUILD PLAYERS: ${totalPlayers} BAN PLAYERS: ${bannedPlayers}`,
        type: 3
      });
    }


  };

  updatePlayers();
  setInterval(updatePlayers, 60000); // 1 minute par update karega
});




// TOTAL DAYS column ko update karna
croncrom.schedule('0 0 * * *', () => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    const joinDateIndex = headers.findIndex(header => header.trim().toLowerCase() === 'join date');
    const leaveDateIndex = headers.findIndex(header => header.trim().toLowerCase() === 'leave date');
    const totalDaysIndex = headers.findIndex(header => header.trim().toLowerCase() === 'total days');
    const minPointsIndex = headers.findIndex(header => header.trim().toLowerCase() === 'min points');
    const statusIndex = headers.findIndex(header => header.trim().toLowerCase() === 'status');
    const updatedLines = lines.map((line, index) => {
      if (index === 0) return line;
      const values = line.split(',');
      if (values[joinDateIndex] === undefined || values[joinDateIndex] === null) {
        console.error(`Error: Join date value is missing for line ${index + 1}`);
        return line;
      }
      if (values[statusIndex].trim().toLowerCase() === 'in guild') {
        const joinDate = moment(values[joinDateIndex].trim(), 'MMM-D-YYYY');
        const today = moment();
        const daysSinceJoin = today.diff(joinDate, 'days');
        values[totalDaysIndex] = daysSinceJoin.toString();
      } else {
        const joinDate = moment(values[joinDateIndex].trim(), 'MMM-D-YYYY');
        const leaveDate = moment(values[leaveDateIndex].trim(), 'MMM-D-YYYY');
        const daysBetweenJoinAndLeave = leaveDate.diff(joinDate, 'days');
        values[totalDaysIndex] = daysBetweenJoinAndLeave.toString();
      }
      const minPoints = values[totalDaysIndex] * limit;
      values[minPointsIndex] = minPoints.toString();
      return values.join(',');
    });
    const updatedData = updatedLines.join('\n');
    fs.writeFile(filePath, updatedData, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('TOTAL DAYS column updated successfully!');
        console.log('MIN POINTS column updated successfully!');
        const channel = client.channels.cache.get(authJson.terminal);
        if (channel) {
          channel.send('TOTAL DAYS column updated successfully!\nMIN POINTS column updated successfully!');
        } else {
          console.error('Channel not found!');
        }
      }
    });
  });
});

//bot command code interaction

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const logMessage = `[${new Date().toLocaleString()}] ${interaction.user.username} (${interaction.user.id}) used command: ${interaction.commandName}`;
  console.log(logMessage);
  const username = interaction.user.id;
  const today = new Date();
  const logDate = `${today.toLocaleString('default', { month: 'short' })}-${today.getDate()}-${today.getFullYear()}`;
  const logFilePath = `logs/${logDate}.txt`;
  fs.mkdirSync('logs', { recursive: true });
  fs.appendFileSync(logFilePath, logMessage + '\n');
  const logChannel = client.channels.cache.get(authJson.console); // apne channel ID ko yahaan replace karein
  if (!logChannel) return console.error('Log channel not found!');
  logChannel.send(logMessage);


  //FORCE TO RESTART
  if (interaction.commandName === 'restart') {
    if (interaction.user.id === '636802010066190346') {
      await interaction.reply('Bot is restarting...');
      process.exit(0);
      require('child_process').exec('npm start');
    } else {
      await interaction.reply({ content: 'You do not have permission to restart the bot!', ephemeral: true });
    }
  }


  //WEEKLU POINTS OF GUILD COMMAND CODE

  if (interaction.commandName === 'weekly-points') {
    if (authid.includes(username)) {
      try {
        await interaction.deferReply({ ephemeral: false });

        // Get points from interaction options
        const points = interaction.options.getInteger('points');

        // Get current date
        const date = new Date();
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        // Check if graph.csv file exists, if not create it with header
        if (!fs.existsSync(graphPath)) {
          fs.writeFileSync(graphPath, 'Date,Points\n');
        }

        // Append data to CSV file
        const csvData = `${formattedDate},${points}\n`;
        fs.appendFile('graph.csv', csvData, (err) => {
          if (err) {
            console.error(err);
            interaction.editReply('Error saving data to CSV file.');
          } else {
            interaction.editReply(`Points saved successfully!`);
          }
        });
      } catch (error) {
        console.error(error);
        interaction.editReply('Error occurred while processing weekly points request.');
      }
    } else {
      interaction.reply({ content: 'Error: You do not have permission to download files!', ephemeral: true });
    }
  }

  // use for ping command
  if (interaction.commandName === 'ping') {
    try {
      const startTime = Date.now();
      await interaction.deferReply();
      const endTime = Date.now();
      const latency = endTime - startTime;
      const ping = Math.floor(latency / 40);
      const uptime = process.uptime();
      const seconds = Math.floor(uptime % 60);
      const minutes = Math.floor((uptime % 3600) / 60);
      const hours = Math.floor(uptime / 3600);
      let uptimeString = '';
      if (hours > 0) uptimeString += `${hours} hour${hours > 1 ? 's' : ''} `;
      if (minutes > 0) uptimeString += `${minutes} minute${minutes > 1 ? 's' : ''} `;
      if (seconds > 0 || uptimeString === '') uptimeString += `${seconds} second${seconds > 1 ? 's' : ''}`;
      const currentDate = new Date();
      const currentDateString = `${currentDate.toLocaleString('en-US', { weekday: 'long' })}, ${currentDate.getDate()} ${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()} ${currentDate.toLocaleTimeString('en-US', { hour12: true })}`;
      interaction.editReply({ content: `Pong! Latency: ${Math.floor(ping)}ms\nUptime: ${uptimeString}\nCurrent Date and Time: ${currentDateString}`, ephemeral: true });
    } catch (error) {
      console.error(error);
      interaction.editReply('Error: Something went wrong!');
    }
  }
  //DOWNLOAD COMMAND
  if (interaction.commandName === 'download') {
    if (authid.includes(username)) {
      try {
        const fileName = interaction.options.getString('file_name');
        const file = fileName;
        await interaction.reply({
          files: [file],
          content: `${fileName} downloaded successfully!`,
        });
      } catch (error) {
        console.error(error);
        interaction.reply('Error: Unable to download file!');
      }
    } else {
      interaction.reply({ content: 'Error: You do not have permission to download files!', ephemeral: true });
    }
  }


  //use for edit point command
  if (interaction.commandName === 'edit_points') {
    try {
      await interaction.deferReply();
      const userId = interaction.user.id;
      const setTotalPoints = interaction.options.getInteger('your_total_points');

      const today = new Date();
      const day = today.getDay(); // 1 = Monday, 2 = Tuesday, ...
      const hours = today.getHours();
      const minutes = today.getMinutes();

      if (day === 1 && (hours >= 4 && hours < 23)) {
        await interaction.editReply('YOUR POINTS CANNOT BE UPDATE BECAUSE OF DATABASE CALCULATE POINTS NOW YOU CAN TRY AFTER 11 PM');
        return;
      }

      // pass.csv file ko read karo
      const passData = fs.readFileSync(passPath, 'utf8').split('\n');

      // userId ko pass.csv me dundhna hai
      let uid = null;
      passData.forEach((row) => {
        const rowData = row.split(',');
        if (rowData[0].trim() === userId.trim()) {
          uid = rowData[1].trim();
        }
      });

      if (!uid) {
        await interaction.editReply({ content: 'User ID not found!', ephemeral: true });
        return;
      }

      // guild.csv file ko read karo
      const data = fs.readFileSync(guildPath, 'utf8').split('\n');
      const headers = data[0].split(',');
      const columns = {
        'UID': headers.findIndex(header => header.trim().toLowerCase() === 'uid'),
        'PLAYER NAME': headers.findIndex(header => header.trim().toLowerCase() === 'player name'),
        'STATUS': headers.findIndex(header => header.trim().toLowerCase() === 'status'),
        'CURRENT TOTAL POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'current total points'),
        'LAST TOTAL POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'last total points'),
        'POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'points'),
        'POINTS LIMIT': headers.findIndex(header => header.trim().toLowerCase() === 'points limit')
      };

      if (Object.values(columns).includes(-1)) {
        await interaction.editReply({ content: 'Error: One or more columns not found!', ephemeral: true });
        return;
      }

      let reply = 'UID not found!';
      let uidFound = false;
      data.slice(1).forEach((row, index) => {
        const rowData = row.split(',');
        if (rowData[columns['UID']].trim() === uid.trim()) {
          uidFound = true;
          const status = rowData[columns['STATUS']].trim();
          if (status.toLowerCase() === 'kicked') {
            reply = { content: 'You cannot edit the points because the player is not in the guild.', ephemeral: true };
          } else {
            const pointsDiff = setTotalPoints - parseInt(rowData[columns['CURRENT TOTAL POINTS']]);
            if (pointsDiff <= parseInt(rowData[columns['POINTS LIMIT']])) {
              rowData[columns['CURRENT TOTAL POINTS']] = setTotalPoints.toString();
              rowData[columns['LAST TOTAL POINTS']] = rowData[columns['CURRENT TOTAL POINTS']];
              rowData[columns['POINTS']] = (parseInt(rowData[columns['POINTS']]) + pointsDiff).toString();
              rowData[columns['POINTS LIMIT']] = (parseInt(rowData[columns['POINTS LIMIT']]) - pointsDiff).toString();
              data[index + 1] = rowData.join(',');
              fs.writeFileSync('guild.csv', data.join('\n'), 'utf8');
              reply = { content: `Points updated successfully! The current total points for UID ${uid} are now: ${setTotalPoints} and your points: ${pointsDiff}. Points limit updated: ${rowData[columns['POINTS LIMIT']]}`, ephemeral: true };
            } else {
              const requirePoints = pointsDiff - parseInt(rowData[columns['POINTS LIMIT']]);
              reply = { content: `Points are out of limit! You can't add more points than the limit.`, ephemeral: true };
              const targetUser = client.users.cache.get('636802010066190346');
              if (!targetUser) {
                client.users.fetch('636802010066190346').then((user) => {
                  user.send(`Points are out of limit for UID: ${uid} (Player Name: ${rowData[columns['PLAYER NAME']]}). Please add ${requirePoints} Points`);
                }).catch((error) => {
                  console.error(error);
                });
              } else {
                targetUser.send(`Points are out of limit for UID: ${uid} (Player Name: ${rowData[columns['PLAYER NAME']]}). Please add ${requirePoints} Points`);
              }

            }
          }
        }
      });

      if (!uidFound) {
        reply = { content: 'UID not found!', ephemeral: true };
      }
      await interaction.editReply(reply);
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'There was an error while processing your request.', ephemeral: true });
    }
  }

  //code for uid command

  if (interaction.commandName === 'uid') {
    try {
      await interaction.deferReply();
      const uid = interaction.options.getString('uid');
      const data = fs.readFileSync(filePath, 'utf8').split('\n');
      const headers = data[0].split(',');
      const columns = {
        'UID': headers.findIndex(header => header.trim().toLowerCase() === 'uid'),
        'PLAYER NAME': headers.findIndex(header => header.trim().toLowerCase() === 'player name'),
        'JOIN DATE': headers.findIndex(header => header.trim().toLowerCase() === 'join date'),
        'METHOD': headers.findIndex(header => header.trim().toLowerCase() === 'method'),
        'RANK': headers.findIndex(header => header.trim().toLowerCase() === 'rank'),
        'STATUS': headers.findIndex(header => header.trim().toLowerCase() === 'status'),
        'REASON': headers.findIndex(header => header.trim().toLowerCase() === 'reason'),
        'LEAVE DATE': headers.findIndex(header => header.trim().toLowerCase() === 'leave date'),
        'KICKED SCORE': headers.findIndex(header => header.trim().toLowerCase() === 'kicked score'),
        'KICKED STATUS': headers.findIndex(header => header.trim().toLowerCase() === 'kicked status'),
        'CURRENT TOTAL POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'current total points'),
        'POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'points'),
        'GUILDMATES FRIEND': headers.findIndex(header => header.trim().toLowerCase() === 'guildmates friend'),
        'TOTAL DAYS': headers.findIndex(header => header.trim().toLowerCase() === 'total days'),
        'MIN POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'min points'),
      };

      if (Object.values(columns).includes(-1)) {
        await interaction.editReply('Error: One or more columns not found!');
        return;
      }

      let reply = 'UID not found!';
      data.slice(1).forEach((row) => {
        const rowData = row.split(',');

        // Check if rowData[columns['UID']] is not undefined or null
        if (rowData[columns['UID']] && rowData[columns['UID']].trim() === uid.trim()) {
          const status = rowData[columns['STATUS']] && rowData[columns['STATUS']].trim();
          if (status && status.toLowerCase() === 'kicked') {
            reply = `🪪**UID:** ${rowData[columns['UID']]}\n\n👤**Player Name:** ${rowData[columns['PLAYER NAME']]}\n\n🗓️**Join Date:** ${rowData[columns['JOIN DATE']]}\n\n🔗**Method:** ${rowData[columns['METHOD']]}\n\n📊**Rank:** ${rowData[columns['RANK']]}\n\n🌐**Status:** ${rowData[columns['STATUS']]}\n\n📮**Reason:** ${rowData[columns['REASON']]}\n\n🗂️**Leave Date:** ${rowData[columns['LEAVE DATE']]}\n\n🎲**Kicked Score:** ${rowData[columns['KICKED SCORE']]}\n\n📌**Kicked Status:** ${rowData[columns['KICKED STATUS']]}\n\n🕛**TOTAL DAYS:** ${rowData[columns['TOTAL DAYS']]}\n\n📋**Current Total Points:** ${rowData[columns['CURRENT TOTAL POINTS']]}\n\n📃**Points:** ${rowData[columns['POINTS']]}\n\n👥**Guildmates Friend:** ${rowData[columns['GUILDMATES FRIEND']]}`;
          } else {
            reply = `🪪**UID:** ${rowData[columns['UID']]}\n\n👤**Player Name:** ${rowData[columns['PLAYER NAME']]}\n\n🗓️**Join Date:** ${rowData[columns['JOIN DATE']]}\n\n🔗**Method:** ${rowData[columns['METHOD']]}\n\n📊**Rank:** ${rowData[columns['RANK']]}\n\n🌐**Status:** ${rowData[columns['STATUS']]}\n\n📋**Current Total Points:** ${rowData[columns['CURRENT TOTAL POINTS']]}\n\n📃**Points:** ${rowData[columns['POINTS']]}\n\n👥**Guildmates Friend:** ${rowData[columns['GUILDMATES FRIEND']]}\n\n🕛**TOTAL DAYS:** ${rowData[columns['TOTAL DAYS']]}\n\n⚠️**MIN POINTS:** ${rowData[columns['MIN POINTS']]}`;
          }
        }
      });

      await interaction.editReply(reply);
    } catch (error) {
      console.error(error);
      await interaction.editReply('Please enter your uid!');
    }
  }
  //code for regester command
  if (interaction.commandName === 'uid-regester') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const uid = interaction.options.getString('uid');
      const password = interaction.options.getString('password');
      const yourEmailId = interaction.options.getString('email');
      const userIDacc = interaction.user.id
      const csvFile = passPath;
      const csvData = [];
      const channelID = authJson['apply-register-forgot']; // Replace with your channel ID

      if (interaction.channelId !== channelID) {
        interaction.editReply('Please use this command in the #📝┃ᴀᴘᴘʟʏ-ʀᴇɢɪsᴛʀᴀᴛɪᴏɴ-ᴠᴇʀɪғʏ channel.');
        return;
      }

      const guildCsvFile = guildPath;
      const guildCsvData = [];
      fs.createReadStream(guildCsvFile)
        .pipe(csv())
        .on('data', (row) => {
          guildCsvData.push(row);
        })
        .on('end', () => {
          const existingUidInGuild = guildCsvData.find((row) => row.UID === uid);
          if (!existingUidInGuild) {
            interaction.editReply({
              content: 'Error: UID not found in our guild database!',
              ephemeral: true,
            });
            return;
          }
      
          const status = existingUidInGuild.STATUS.trim().toUpperCase();
          if (status !== 'IN GUILD') {
            interaction.editReply({
              content: 'Before registering, please join the guild first.',
              ephemeral: true,
            });
            return;
          }
      

          // Check if UID already exists in pass.csv
          fs.createReadStream(csvFile)
            .pipe(csv())
            .on('data', (row) => {
              csvData.push(row);
            })
            .on('end', () => {
              const existingUidInPass = csvData.find((row) => row.UID === uid);
              const existingUseridInPass = csvData.find((row) => row.User_ID === userIDacc);
              if (existingUidInPass || existingUseridInPass) {
                interaction.editReply({ content: 'Error: UID already registered!', ephemeral: true, });
                return;
              }

              // Generate OTP and register user
              const otp = Math.floor(100000 + Math.random() * 900000);
              const newRow = {
                User_ID: userIDacc,
                UID: uid,
                Password: password,
                Your_Email_Id: yourEmailId,
                OTP: otp,
                Time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                Status: 'NOT VERIFIED',
                New_Password: 'none',
                Forgot_Status: 'none',
                Purpose: 'register',
                Old_User_ID: userIDacc
              };
              csvData.push(newRow);
              fs.writeFileSync(csvFile, Object.keys(newRow).join(',') + '\n' + csvData.map((row) => Object.values(row).join(',')).join('\n'));

              // Email functionality
              const mailOptions = {
                from: '"Guild"<ffguildmahadev@gmail.com>',
                to: yourEmailId,
                subject: 'EMAIL VERIFICATION REQUEST!',
                html: `<html>
  <body style="font-family: sans-serif; background-color: #f0f0f0; background-image: linear-gradient(to bottom, #f0f0f0, #e0e0e0); padding: 20px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; text-align: left; background-color: #ffffff; padding: 20px; border: 1px solid #dddddd; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <header style="background-color: #333; color: #ffffff; padding: 10px; text-align: center; border-bottom: 1px solid #dddddd; font-family: sans-serif;">
        <h1 style="font-size: 24px; font-weight: bold;">EMAIL VERIFICATION</h1>
      </header>
      <div style="padding: 20px;">
        <p style="color: #000; font-size: 13px; font-weight: bold;">WE ARE RECEVIED YOUR REQUEST OF REGISTRATION TO BIND YOUR GAME UID${uid} AND DISCORD USER ID ${userIDacc}</p>
        <p style="color: #000; font-size: 13px; font-weight: bold;">TO VERIFY YOUR EMAIL ${yourEmailId} USE /verify AND ENTER THE OTP.THIS OTP WILL EXPIRE IN 10 MINUTES. </p>
        <p style="color: #000; font-size: 13px; font-weight: bold;">IF YOU CANT ABLE TO VERIFY YOUR EMAIL THEN AFTER 10 MINUTS YOUR DETAILS WILL BE TERMINATED</p>
        <p style="color: #000; font-size: 16px; font-weight: bold;">YOUR OTP: ${otp}</p>
        <p style="color: #000; font-size: 12px; text-align: right; font-weight: bold;">SINCERELY,</p>
        <p style="color: #000; font-size: 12px; text-align: right; font-weight: bold;">IGL BOT</p>
      </div>
    </div>
  </body>
</html>`
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
              interaction.editReply({ content: '**Please check your email we send you and OTP after getting OTP use /verify to verify your registration. Else your registration has been deleted by automatically after 10 minutes**', ephemeral: true });
            });
        });
    } catch (error) {
      console.error(error);
      interaction.editReply({ content: 'Error: Something went wrong!', ephemeral: true });
    }
  }


  //code for forgot password
  if (interaction.commandName === 'forgot-password') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const uid = interaction.options.getString('uid');
      const newPassword = interaction.options.getString('new-password');
      const passData = fs.readFileSync(passPath, 'utf8').split('\n');
      const passHeaders = passData[0].split(',');
      const uidIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'uid');
      const newPasswordIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'new_password');
      const forgotStatusIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'forgot_status');
      const otpIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'otp');
      const timeIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'time');
      const emailIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'your_email_id');
      const purposeIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'purpose');
      const oldUserIndex = passHeaders.findIndex(header => header.trim().toLowerCase() === 'old_user_id');


      const channelID = authJson['apply-register-forgot']; // Replace with your channel ID

      if (interaction.channelId !== channelID) {
        interaction.editReply('Please use this command in the #📝┃ᴀᴘᴘʟʏ-ʀᴇɢɪsᴛʀᴀᴛɪᴏɴ-ᴠᴇʀɪғʏ channel.');
        return;
      }

      const guildCsvFile = guildPath;
      const guildCsvData = fs.readFileSync(guildCsvFile, 'utf8').split('\n');
      const guildHeaders = guildCsvData[0].split(',');
      const uidIndexguild = guildHeaders.findIndex(header => header.trim().toLowerCase() === 'uid');
      const statusIndex = guildHeaders.findIndex(header => header.trim().toLowerCase() === 'status');

      // UID ka STATUS check karo
      const guildRow = guildCsvData.find((row) => {
        const rowData = row.split(',');
        return rowData[uidIndexguild] === uid;
      });

      if (!guildRow) {
        await interaction.editReply({ content: 'UID not found in guild data.', ephemeral: true });
        return;
      }

      const status = guildRow.split(',')[statusIndex].trim().toUpperCase();

      if (status !== 'IN GUILD') {
        await interaction.editReply({ content: 'Before forgot the password, please join the guild first.', ephemeral: true });
        return;
      }

      const userRow = passData.find((row) => {
        const rowData = row.split(',');
        return rowData[uidIndex] === uid;
      });

      if (!userRow) {
        await interaction.editReply({ content: 'UID invalid', ephemeral: true });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false })
      const updatedPassData = passData.map((row) => {
        const rowData = row.split(',');
        if (rowData[uidIndex] === uid) {
          rowData[newPasswordIndex] = newPassword;
          rowData[forgotStatusIndex] = 'PROCESS';
          rowData[otpIndex] = otp.toString();
          rowData[timeIndex] = currentTime;
          rowData[purposeIndex] = 'forgot'
          return rowData.join(',');
        }
        return row;
      });

      fs.writeFileSync(passPath, updatedPassData.join('\n'));
      const useridname = interaction.user.username;
      const userIDacc = interaction.user.id;
      const email = userRow.split(',')[emailIndex];
      const mailOptions = {
        from: '"Guild"<ffguildmahadev@gmail.com>',
        to: email,
        subject: 'FORGOT PASSWORD',
        html: `
              <html>
                <body style="font-family: sans-serif; background-color: #f0f0f0; background-image: linear-gradient(to bottom, #f0f0f0, #e0e0e0); padding: 20px; text-align: center;">
                  <div style="max-width: 600px; margin: 0 auto; text-align: left; background-color: #ffffff; padding: 20px; border: 1px solid #dddddd; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                    <header style="background-color: #333; color: #ffffff; padding: 10px; text-align: center; border-bottom: 1px solid #dddddd; font-family: sans-serif;">
                      <h1 style="font-size: 24px; font-weight: bold;">RESET PASSWORD</h1>
                    </header>
                    <div style="padding: 20px;">
                      <p style="color: #000; font-size: 13px; font-weight: bold;">WE ARE RECEVIED YOUR REQUEST OF PASSWORD RESET OF YOUR GAME UID:${uid}</p>
                      <p style="color: #000; font-size: 13px; font-weight: bold;">THIS REQUEST IS GENERATED FROM DISCORD USER:${useridname}  DISCORD USER ID:${userIDacc}</p>
                      <p style="color: #000; font-size: 13px; font-weight: bold;">IF THIS REQUEST IS NOT GENERATED BY YOU THE REPORT US THIS USER AND USER ID ON THIS MAIL ffguildmahadev@gmail.com</p>
                      <p style="color: #000; font-size: 13px; font-weight: bold;">OTHERWISE YOU CAN USE /verify TO VERIFY THIS OTP.THE OTP WILL EXPIRE IN 10 MINUTES.</p>
                      <p style="color: #000; font-size: 16px; font-weight: bold;">YOUR OTP: ${otp}</p>
                      <p style="color: #000; font-size: 12px; text-align: right; font-weight: bold;">SINCERELY,</p>
                      <p style="color: #000; font-size: 12px; text-align: right; font-weight: bold;">IGL BOT</p>
                    </div>
                  </div>
                </body>
              </html>`
            
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      await interaction.editReply({ content: 'OTP sent to your email. Please verify it.', ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'An error occurred. Please contact the guild leader.', ephemeral: true });
    }
  }

  //verify code
  if (interaction.commandName === 'verify') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const otp = interaction.options.getString('otp');
      const uid = interaction.options.getString('uid');
      const userIDacc = interaction.user.id;
      const csvFile = passPath
      const csvData = [];
      const channelID = authJson['apply-register-forgot']; // Replace with your channel ID

      if (interaction.channelId !== channelID) {
        interaction.editReply('Please use this command in the #📝┃ᴀᴘᴘʟʏ-ʀᴇɢɪsᴛʀᴀᴛɪᴏɴ-ᴠᴇʀɪғʏ channel.');
        return;
      }
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          let userRow;
          if (uid) {
            userRow = csvData.find((row) => row.UID === uid);
          } else {
            userRow = csvData.find((row) => row.User_ID === userIDacc);
          }
          if (!userRow) {
            if (uid) {
              interaction.editReply({ content: 'UID not found.', ephemeral: true });
            } else {
              interaction.editReply({ content: 'User ID not match. Please try enter UID.', ephemeral: true });
            }
            return;
          }
          const purpose = userRow.Purpose.trim().toLowerCase();
          if (purpose === 'register') {
            if (userRow.Status === 'VERIFIED') {
              interaction.editReply({ content: 'You are already verified.', ephemeral: true });
              return;
            }

            if (userRow.OTP === otp) {
              userRow.Status = 'VERIFIED';

              if (uid && userRow.User_ID !== userIDacc) {
                userRow.User_ID = userIDacc;
              }

              // Update nickname
              const guildCsvFile = guildPath;
              const guildCsvData = [];

              fs.createReadStream(guildCsvFile)
                .pipe(csv())
                .on('data', (row) => {
                  guildCsvData.push(row);
                })
                .on('end', () => {
                  const guildRow = guildCsvData.find((row) => row.UID === userRow.UID);

                  if (guildRow) {
                    const playerName = guildRow['PLAYER NAME'];
                    const pluid = guildRow['UID'];

                    if (interaction.member) {
                      interaction.member.setNickname(`${playerName}`)
                        .then(() => {
                          console.log(`User ${interaction.user.id} nickname is changed to: ${playerName}`);
                        })
                        .catch((error) => {
                          console.error(`User ${interaction.user.id} nickname was not change because of: ${error.message}`);
                        });

                      const guildMemberRoleId = '1285469617996828773';
                      interaction.member.roles.add(guildMemberRoleId)
                        .then(() => {
                          console.log(`User ${interaction.user.id} was get the role of: ${guildMemberRoleId}`);
                        })
                        .catch((error) => {
                          console.error(`User ${interaction.user.id} has not get the role because of: ${error.message}`);
                        });

                      // Update status in pass.csv
                      const updatedCsvData = csvData.map((row) => {
                        if (row.User_ID === userRow.User_ID) {
                          row.Status = 'VERIFIED';
                        }
                        return row;
                      });

                      fs.writeFileSync(csvFile, Object.keys(updatedCsvData[0]).join(',') + '\n' + updatedCsvData.map((row) => Object.values(row).join(',')).join('\n'));
                      const formattedDate = `${new Date().getDate().toString().padStart(2, '0')}-${new Date().toLocaleString('default', { month: 'long' })}-${new Date().getFullYear()}`;
                      // Send email
                      const email = userRow.Your_Email_Id;
                      const subject = 'Account Verified!';
                      const html = `<html>
                                        <body style="font-family: sans-serif; background-color: #f0f0f0; background-image: linear-gradient(to bottom, #f0f0f0, #e0e0e0); padding: 20px; text-align: center;">
                                          <div style="max-width: 600px; margin: 0 auto; text-align: left; background-color: #ffffff; padding: 20px; border: 1px solid #dddddd; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
                                            <header style="background-color: #333; color: #ffffff; padding: 10px; text-align: center; border-bottom: 1px solid #dddddd; font-family: sans-serif;">
                                              <h1 style="font-size: 24px; font-weight: bold;">VERIFICATION CERTIFICATE</h1>
                                            </header>
                                            <div style="padding: 20px;">
                                              <p style="color: #000; font-size: 14px; font-weight: bold;">HELLO, ${playerName}</p>
                                              <p style="color: #000; font-size: 10px; font-weight: bold;">YOUR GAME UID HAS BEEN SUCCESSFULLY BOUND TO YOUR DISCORD ACCOUNT. YOU CAN NOW USE THE /EDIT_POINTS COMMAND.</p>
                                              <p style="color: #000; font-size: 10px; font-weight: bold;">ADDITIONALLY, YOU HAVE BEEN ADDED TO THE GUILD MEMBERS SECTION OF OUR DISCORD SERVER, AND YOUR DISCORD NAME HAS BEEN UPDATED TO MATCH YOUR IN-GAME NAME.</p>
                                              <p style="color: #000; font-size: 10px; font-weight: bold;">WE RECOMMEND READING THE RULE BOOK FOR FURTHER INFORMATION.</p>
                                              <p style="color: #000; font-size: 12px; font-weight: bold;">DISCORD ID: ${userIDacc}</p>
                                              <p style="color: #000; font-size: 12px; font-weight: bold;">GAME ID: ${pluid}</p>
                                              <p style="color: #000; font-size: 10px; text-align: right; font-weight: bold;">SINCERELY,</p>
                                              <p style="color: #000; font-size: 10px; text-align: right; font-weight: bold;">IGL BOT</p>
                                              <p style="color: #000; font-size: 10px; text-align: right; font-weight: bold;">DATE OF VERIFICATION</p>
                                              <p style="color: #000; font-size: 10px; text-align: right; font-weight: bold;">${formattedDate}</p>
                                              <div style="text-align: center; margin-top: 20px;">
                                                <a href="https://drive.google.com/file/d/1Y8tBhenH6MSyiWQ-T6EnzoRpGS2-bwEK/view?usp=sharing" target="_blank">
                                                  <button style="background-color: #060fc5; color: #ffffff; font-size: 16px; font-weight: bold; border: none; padding: 15px 30px; cursor: pointer; border-radius: 10px;">GUILD RULES</button>
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        </body>
                                      </html>`;

                      const mailOptions = {
                        from: '"Guild"<ffguildmahadev@gmail.com>',
                        to: email,
                        subject: subject,
                        html: html,
                      };

                      transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                          console.error(error);
                        } else {
                          console.log('Email sent: ' + info.response);
                        }
                      });

                      interaction.editReply({ content: `Verified successfully! Your status has been updated to VERIFIED.`, ephemeral: true });
                    } else {
                      console.log('Error: interaction.member is null');
                      interaction.editReply({ content: `Error: You cannot use this command on personal dm please use our discord servers channel!!!`, ephemeral: true });
                    }
                  } else {
                    interaction.editReply({ content: 'Error: Guild data not found.', ephemeral: true });
                  }
                });
            } else {
              interaction.editReply({ content: 'Invalid OTP. Please try again.', ephemeral: true });
            }
          }
          else if (purpose === 'forgot') {
            if (userRow.Forgot_Status === 'DONE') {
              interaction.editReply({ content: 'Your password is already updated.', ephemeral: true });
            } else if (userRow.Forgot_Status === 'PROCESS') {
              if (userRow.OTP === otp) {
                userRow.Old_User_ID = userRow.User_ID;
                userRow.Password = userRow.New_Password;
                userRow.Forgot_Status = 'DONE';
                // Update User ID
                userRow.User_ID = interaction.user.id;
                // Update nickname
                const guildCsvFile = guildPath;
                const guildCsvData = [];
                fs.createReadStream(guildCsvFile)
                  .pipe(csv())
                  .on('data', (row) => {
                    guildCsvData.push(row);
                  })
                  .on('end', () => {
                    const guildRow = guildCsvData.find((row) => row.UID === userRow.UID);
                    if (guildRow) {
                      const playerName = guildRow['PLAYER NAME'];
                      if (interaction.member) {
                        interaction.member.setNickname(`${playerName}`)
                          .then(() => {
                            console.log(`User ${interaction.user.id} nickname is changed to: ${playerName}`);
                          })
                          .catch((error) => {
                            console.error(`User ${interaction.user.id} nickname was not change because of: ${error.message}`);
                          });
                        // Assign role
                        const guildMemberRoleId = '1285469617996828773';
                        interaction.member.roles.add(guildMemberRoleId)
                          .then(() => {
                            console.log(`User ${interaction.user.id} was get the role of: ${guildMemberRoleId}`);
                          })
                          .catch((error) => {
                            console.error(`User ${interaction.user.id} has not get the role because of: ${error.message}`);
                          });
                      }
                    }
                    // Update User ID
                    fs.writeFileSync(csvFile, Object.keys(userRow).join(',') + '\n' + csvData.map((row) => Object.values(row).join(',')).join('\n'));
                    interaction.editReply({ content: 'Password and nickname updated successfully!', ephemeral: true });
                  });
              } else {
                interaction.editReply({ content: 'Invalid OTP. Please try again.', ephemeral: true });
              }
            } else {
              interaction.editReply({ content: 'You didn\'t send request for update password.', ephemeral: true });
            }
          }
          else {
            interaction.editReply({ content: 'Invalid purpose. Please try again.', ephemeral: true });
          }

        });
    } catch (error) {
      console.error(error);
      interaction.editReply({ content: 'Error: Something went wrong!', ephemeral: true });
    }
  }



  //add_player code command
  if (interaction.commandName === 'add_new_player') {
    try {
      await interaction.deferReply();
      const uid = interaction.options.getString('uid');
      const playerName = interaction.options.getString('player_name');
      const today = new Date();
      const joinDate = `${today.toLocaleString('default', { month: 'short' })}-${today.getDate()}-${today.getFullYear()}`;
      const method = interaction.options.getString('method');
      const guildmatesFriends = interaction.options.getString('guildmates_friends');
      const csvFile = guildPath;
      if (authid.includes(username)) {
        const csvData = [];
        fs.createReadStream(csvFile)
          .pipe(csv())
          .on('data', (row) => {
            csvData.push(row);
          })
          .on('end', () => {
            const existingUid = csvData.find((row) => row.UID === uid);
            if (existingUid) {
              if (existingUid.STATUS === 'KICKED') {
                if (existingUid['KICKED SCORE'] === '10') {
                  interaction.editReply(`This player is banned from the guild. You cannot add this player.`);
                  return;
                }
                existingUid['PLAYER NAME'] = playerName;
                existingUid['JOIN DATE'] = joinDate;
                existingUid['METHOD'] = method;
                existingUid['RANK'] = 'MEMBER';
                existingUid['STATUS'] = 'IN GUILD';
                existingUid['DEAFULT SCYN'] = 'FF';
                existingUid['GUILDMATES FRIEND'] = guildmatesFriends;
                // Yeh columns ko update nahi karenge agar unke values blank hain
                if (existingUid['REASON'] !== "") {
                  // kuch nahi karna hai
                } else {
                  existingUid['REASON'] = "";
                }
                if (existingUid['LEAVE DATE'] !== "") {
                  // kuch nahi karna hai
                } else {
                  existingUid['LEAVE DATE'] = "";
                }
                if (existingUid['KICKED SCORE'] !== "") {
                  // kuch nahi karna hai
                } else {
                  existingUid['KICKED SCORE'] = "";
                }
                if (existingUid['KICKED STATUS'] !== "") {
                  // kuch nahi karna hai
                } else {
                  existingUid['KICKED STATUS'] = "";
                }
                // Yeh columns ko update karenge agar unke values milte hain
                existingUid['LAST TOTAL POINTS'] = '0';
                existingUid['CURRENT TOTAL POINTS'] = '0';
                existingUid['THIS WEEK WAR TOTAL POINTS'] = '0';
                existingUid['LAST WEEK WAR TOTAL POINTS'] = '0';
                existingUid['POINTS'] = '0';
                existingUid['WAR POINTS'] = '0';
                existingUid['REQUEST FOR TEMPORARY BREAK'] = 'NO';
                existingUid['CHANGE NAME'] = 'NO';
                existingUid['TOTAL DAYS'] = '0';
                existingUid['MIN POINTS'] = '0';
                existingUid['POINTS LIMIT'] = '6000';
                fs.writeFileSync(csvFile, 'SR NO,UID,PLAYER NAME,JOIN DATE,METHOD,RANK,STATUS,DEAFULT SCYN,REASON,LEAVE DATE,KICKED SCORE,KICKED STATUS,LAST TOTAL POINTS,CURRENT TOTAL POINTS,THIS WEEK WAR TOTAL POINTS,LAST WEEK WAR TOTAL POINTS,POINTS,WAR POINTS,REQUEST FOR TEMPORARY BREAK,CHANGE NAME,GUILDMATES FRIEND,TOTAL DAYS,MIN POINTS,POINTS LIMIT\n' + csvData.map((row) => Object.values(row).join(',')).join('\n'));
                const channel = client.channels.cache.get(authJson.guild-aleart);
                if (channel) {
                  channel.send(`😁**${uid}** Welcome Back TO The Guild **${playerName}**🫂`);
                  interaction.editReply(`${uid} player name ${playerName} added`)
                } else {
                  console.error('Channel not found!');
                }
              } else if (existingUid.STATUS === 'IN GUILD') {
                interaction.editReply('Error: UID is already in guild!');
              } else {
                interaction.editReply('Error: UID is not kicked or in guild!');
              }
            } else {
              const newRow = {
                SR_NO: csvData.length + 1,
                UID: uid,
                PLAYER_NAME: playerName,
                JOIN_DATE: joinDate,
                METHOD: method,
                RANK: 'MEMBER',
                STATUS: 'IN GUILD',
                DEAFULT_SCYN: 'FF',
                REASON: null,
                LEAVE_DATE: null,
                KICKED_SCORE: null,
                KICKED_STATUS: null,
                LAST_TOTAL_POINTS: '0',
                CURRENT_TOTAL_POINTS: '0',
                THIS_WEEK_WAR_TOTAL_POINTS: '0',
                LAST_WEEK_WAR_TOTAL_POINTS: '0',
                POINTS: '0',
                WAR_POINTS: '0',
                REQUEST_FOR_TEMPORARY_BREAK: 'NO',
                CHANGE_NAME: 'NO',
                GUILDMATES_FRIEND: guildmatesFriends,
                TOTAL_DAYS: '0',
                MIN_POINTS: '0',
                POINTS_LIMIT: '6000',
              };
              csvData.push(newRow);
              fs.writeFileSync(csvFile, 'SR NO,UID,PLAYER NAME,JOIN DATE,METHOD,RANK,STATUS,DEAFULT SCYN,REASON,LEAVE DATE,KICKED SCORE,KICKED STATUS,LAST TOTAL POINTS,CURRENT TOTAL POINTS,THIS WEEK WAR TOTAL POINTS,LAST WEEK WAR TOTAL POINTS,POINTS,WAR POINTS,REQUEST FOR TEMPORARY BREAK,CHANGE NAME,GUILDMATES FRIEND,TOTAL DAYS,MIN POINTS,POINTS LIMIT\n' +
                csvData.map((row) => Object.values(row).join(',')).join('\n')
              );

              const channel = client.channels.cache.get(authJson['guild-aleart']);
              if (channel) {
                interaction.editReply(`UID:**${uid}** With Player Name:**${playerName}** joined the Guild!`);
                channel.send(`👀UID:**${uid}** With Player Name:**${playerName}** joined the Guild💖!`);
              } else {
                console.error('Channel not found!');
              }

            }
          });
      } else {
        interaction.editReply({ content: 'You dont have access of this command', ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      interaction.editReply('Error: Something went wrong!');
    }
  }


  // players command
  if (interaction.commandName === 'players') {
    try {
      const startTime = Date.now();
      await interaction.deferReply();
      if (authid.includes(username)) {
        const data = fs.readFileSync(guildPath, 'utf8').split('\n');
        const headers = data[0].split(',');
        const playerNameIndex = headers.findIndex(header => header.trim().toLowerCase() === 'player name');
        const playerUIDIndex = headers.findIndex(header => header.trim().toLowerCase() === 'uid');
        const playerStatusIndex = headers.findIndex(header => header.trim().toLowerCase() === 'status');
        const players = data.slice(1).map((row) => {
          const playerData = row.split(',');
          if (!playerData[playerUIDIndex] || !playerData[playerNameIndex] || !playerData[playerStatusIndex]) {
            console.error(`Invalid player data: ${row}`);
            return null;
          }
          return {
            name: playerData[playerNameIndex].trim(),
            uid: playerData[playerUIDIndex].trim(),
            status: playerData[playerStatusIndex].trim(),
          };
        }).filter(Boolean);
        const inGuildPlayers = players.filter((player) => player.status === 'IN GUILD');
        const formattedPlayers = inGuildPlayers.map((player, index) => `${index + 1}. NAME: ${player.name} UID: ${player.uid}`);
        const chunkSize = 2000;
        const chunks = [];
        let chunk = '';
        for (const player of formattedPlayers) {
          if (chunk.length + player.length > chunkSize) {
            chunks.push(chunk);
            chunk = '';
          }
          chunk += `${player}\n`;
        }
        if (chunk.length > 0) {
          chunks.push(chunk);
        }
        for (let i = 0; i < chunks.length; i++) {
          if (i === 0) {
            await interaction.editReply(chunks[i]);
          } else {
            await new Promise(resolve => setTimeout(resolve, 10));
            await interaction.followUp(chunks[i]);
          }
        }
        const endTime = Date.now();
        const latency = endTime - startTime;
        console.log(`Time taken: ${latency}ms`);
      } else {
        interaction.editReply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while processing your request.');
    }
  }

  // KICK CODE

  if (interaction.commandName === 'kick') {
    try {
      await interaction.deferReply();
      const uid = interaction.options.getString('uid');
      const today = new Date();
      const LeaveDate = `${today.toLocaleString('default', { month: 'short' })}-${today.getDate()}-${today.getFullYear()}`;
      const reason = interaction.options.getString('reason');
      const csvFile = guildPath;
      const csvData = [];
      const passCsvFile = passPath;
      const passCsvData = [];
  
      if (interaction.channel !== authJson.pvtcmd) {
        interaction.editReply({ content: 'Error: You cant use this command here!', ephemeral: true });
        return;
      }
  
      if (authid.includes(username)) {
        fs.createReadStream(passCsvFile)
          .pipe(csv())
          .on('data', (row) => {
            passCsvData.push(row);
          })
          .on('end', () => {
            const existingUid = passCsvData.find((row) => row.UID === uid);
            if (existingUid) {
              const userId = existingUid.User_ID;
              if (interaction.guild) {
                interaction.guild.members.fetch(userId).then(member => {
                  if (member) {
                    member.roles.remove('1285469617996828773');
                    console.log(`Role Removed Sucessfully ${userId}`);
                    interaction.editReply(`Guild Member Role Removed From UID:${uid} `);
                  } else {
                    console.error(`Error: Member not found in the guild. User ID: ${userId}`);
                    interaction.reply(`Error: Member not found in the guild. User ID: ${userId}`);
                  }
                }).catch(error => {
                  console.error(`Error: ${error.message}`);
                  interaction.editReply(`Error: ${error.message}`);
                });
              } else {
                console.error('Error: This command cannot be used in DM.');
                interaction.editReply('Error: This command cannot be used in DM.');
              }
            } else {
              console.error(`Error: This user is not verified. UID: ${uid}`);
            }
  
            fs.createReadStream(csvFile)
              .pipe(csv())
              .on('data', (row) => {
                csvData.push(row);
              })
              .on('end', () => {
                const existingUid = csvData.find((row) => row.UID === uid);
                if (existingUid) {
                  existingUid.STATUS = 'KICKED';
                  existingUid['LEAVE DATE'] = LeaveDate;
                  existingUid.REASON = reason;
  
                  // Update KICKED SCORE
                  if (existingUid['KICKED SCORE']) {
                    existingUid['KICKED SCORE'] = parseInt(existingUid['KICKED SCORE']) + 1;
                  } else {
                    existingUid['KICKED SCORE'] = 1;
                  }
  
                  // Check compatibility
                  const kickedScore = existingUid['KICKED SCORE'];
                  let compatibilityMessage = '';
                  if (kickedScore >= 0 && kickedScore <= 3) {
                    compatibilityMessage = 'Average player';
                  } else if (kickedScore >= 4 && kickedScore <= 6) {
                    compatibilityMessage = 'Player is not compatible';
                  } else if (kickedScore >= 7 && kickedScore <= 9) {
                    compatibilityMessage = 'Too bad player';
                  } else if (kickedScore >= 10) {
                    compatibilityMessage = 'You are banned from the guild';
                  }
                  existingUid['KICKED STATUS'] = compatibilityMessage;
  
                  const playerName = existingUid['PLAYER NAME'];
                  const headers = Object.keys(csvData[0]);
                  const data = [headers.join(',')].concat(csvData.map((row) => Object.values(row).join(',')));
                  fs.writeFileSync(csvFile, data.join('\n'));
  
                  const channel = client.channels.cache.get(authJson['guild-aleart']);
                  if (channel) {
                    interaction.editReply(`UID ${uid} **(${playerName})** kicked successfully!\n${compatibilityMessage}`);
                    if (reason === 'LEFT') {
                      channel.send(`UID ${uid} **(${playerName})** was Left the Guild😮‍💨👍🏻`);
                    } else {
                      channel.send(`⚠️UID ${uid} **(${playerName})** was kicked Reason:**${reason}**‼️`);
                    }
                  }
                } else {
                  interaction.editReply(`Error: UID ${uid} not found!`);
                }
              });
          });
      } else {
        interaction.editReply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      interaction.editReply('Error: Something went wrong!');
    }
  }

  // KICK INFO COMMAND CODE
  if (interaction.commandName === 'kick_info') {
    if (authid.includes(username)) {
      const csvFile = guildPath;
      const csvData = [];
      fs.createReadStream(csvFile)
        .pipe(csv({ ignoreEmpty: true, skipEmptyLines: true }))
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          const playersToKick = [];
          csvData.forEach((row) => {
            if (row['STATUS'] && row['STATUS'].trim().toLowerCase() === 'in guild') {
              if (row['RANK'] && row['RANK'].trim().toLowerCase() === 'member') {
                if (row['MIN POINTS'] && row['CURRENT TOTAL POINTS'] && row['TOTAL DAYS']) {
                  const minPoints = parseInt(row['MIN POINTS'] - 40);
                  const currentPoints = parseInt(row['CURRENT TOTAL POINTS']);
                  const totalDays = parseInt(row['TOTAL DAYS']);
                  if (minPoints > currentPoints && totalDays >= 8) {
                    playersToKick.push(`${row['PLAYER NAME']} ${row['UID']}`);
                  }
                }
              }
            }
          });
          const channel = client.channels.cache.get(authJson['guild-aleart']);
          if(channel){
          if (playersToKick.length > 0) {
            
            interaction.reply(`**Players to kick:\n${playersToKick.join('\n')}**`);
            channel.send(`**> Players to kick:\n\`\`\`\n${playersToKick.join('\n')}\`\`\`**`);
          } 
        } else {
            interaction.reply('No players found that meet the kick criteria.');
          }
        });
    } else {
      interaction.editReply({ content: 'You do not have permission to use this command!', ephemeral: true });
    }
  }
  // MASTER ADD
  if (interaction.commandName === 'master_add') {
    if (authid.includes(username)) {
      try {
        await interaction.deferReply();
        const uid = interaction.options.getString('uid');
        const currentTotal = interaction.options.getInteger('current_total');
        const data = fs.readFileSync(filePath, 'utf8').split('\n');
        const headers = data[0].split(',');
        const columns = {
          'UID': headers.findIndex(header => header.trim().toLowerCase() === 'uid'),
          'PLAYER NAME': headers.findIndex(header => header.trim().toLowerCase() === 'player name'),
          'CURRENT TOTAL POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'current total points'),
          'LAST TOTAL POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'last total points'),
          'POINTS': headers.findIndex(header => header.trim().toLowerCase() === 'points')
        };

        if (Object.values(columns).includes(-1)) {
          await interaction.editReply('Error: One or more columns not found!');
          return;
        }

        let reply = 'UID not found!';
        let uidFound = false;
        data.slice(1).forEach((row, index) => {
          const rowData = row.split(',');
          if (rowData[columns['UID']].trim() === uid.trim()) {
            uidFound = true;
            rowData[columns['CURRENT TOTAL POINTS']] = currentTotal.toString();
            const lastTotalPoints = parseInt(rowData[columns['LAST TOTAL POINTS']]);
            const points = currentTotal - lastTotalPoints;
            rowData[columns['POINTS']] = points.toString();
            data[index + 1] = rowData.join(',');
            fs.writeFileSync(filePath, data.join('\n'), 'utf8');
            const playerName = rowData[columns['PLAYER NAME']].trim();
            reply = `CURRENT TOTAL POINTS ${currentTotal} updated successfully for UID ${uid} (${playerName})! Points updated: ${points}`;
          }
        });

        if (!uidFound) {
          reply = 'UID not found!';
        }

        await interaction.editReply(reply);
      } catch (error) {
        console.error(error);
        await interaction.editReply('There was an error while processing your request.');
      }
    } else {
      interaction.reply({ content: 'This command only for admins', ephemeral: true });
    }
  }

  // admin update command
  if (interaction.commandName === 'admin_update') {
    try {
      await interaction.deferReply();
      const uid = interaction.options.getString('uid');
      const playerName = interaction.options.getString('player_name');
      const rank = interaction.options.getString('rank');
      const Topuppoints = interaction.options.getString('top-up-points');
      const csvFile = guildPath;
      const passCsvFile = passPath;

      if (authid.includes(username)) {
        const csvData = [];
        fs.createReadStream(csvFile)
          .pipe(csv())
          .on('data', (row) => {
            csvData.push(row);
          })
          .on('end', () => {
            const existingUid = csvData.find((row) => row.UID === uid);
            if (existingUid) {
              if (playerName) {
                existingUid['PLAYER NAME'] = playerName;
              }
              if (rank) {
                existingUid['RANK'] = rank;
              }
              if (Topuppoints) {
                existingUid['POINTS LIMIT'] = parseInt(existingUid['POINTS LIMIT']) + parseInt(Topuppoints);

                // Update pass.csv file
                const passCsvData = [];
                fs.createReadStream(passCsvFile)
                  .pipe(csv())
                  .on('data', (row) => {
                    passCsvData.push(row);
                  })
                  .on('end', async () => {
                    const pluser = passCsvData.find((row) => row.UID === uid);
                    if (pluser) {
                      const userId = pluser.User_ID;
                      const userDm = await interaction.client.users.fetch(userId);
                      if (userDm) {
                        try {
                          const dmChannel = await userDm.createDM();
                          await dmChannel.send(`> Hello! ${existingUid['PLAYER NAME']} Admin has top-up your points! Your new balance is: ${existingUid['POINTS LIMIT']}`);
                          console.log(`DM sent to user ${userId} successfully!`);
                        } catch (error) {
                          console.error(`Error sending DM to user ${userId}: ${error.message}`);
                        }
                      } else {
                        console.error(`User ${userId} not found in cache!`);
                      }
                    } else {
                      console.error(`User ${uid} not found in pass.csv!`);
                    }
                  });
              }

              const headers = Object.keys(csvData[0]);
              const data = [headers.join(',')].concat(csvData.map((row) => Object.values(row).join(',')));
              fs.writeFileSync(csvFile, data.join('\n'));
              interaction.editReply(`UID ${uid} updated successfully!`);
            } else {
              interaction.editReply(`Error: UID ${uid} not found!`);
            }
          });
      } else {
        interaction.editReply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      interaction.editReply('Error: Something went wrong!');
    }
  }


  //BAN UNBAN CODE
  if (interaction.commandName === 'ban_unban') {
    if (authid.includes(username)) {
      const uid = interaction.options.getString('uid');
      const action = interaction.options.getString('action');

      const csv = require('csv-parser');
      const fs = require('fs');

      const csvData = [];

      fs.createReadStream(guildPath)
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
          if (row.UID === uid) {
            if (action === 'ban') {
              row['KICKED SCORE'] = '10';
              row['KICKED STATUS'] = 'YOU ARE BAN FROM GUILD';
            } else if (action === 'unban') {
              row['KICKED SCORE'] = '9';
              row['KICKED STATUS'] = 'LAST CHANCE';
            }
          }
        })
        .on('end', () => {
          if (csvData.length > 0) {
            fs.writeFileSync(guildPath, Object.keys(csvData[0]).join(',') + '\n');
            csvData.forEach((row) => {
              fs.appendFileSync(guildPath, Object.values(row).join(',') + '\n');
            });
          }
          interaction.reply(`UID ${uid} has been ${action}!`);
        });
    } else {
      interaction.reply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
    }
  }
  //Upload code
  if (interaction.commandName === 'upload') {
    if (authid.includes(username)) {
      const attachment = interaction.options.getAttachment('file');
      if (!attachment) {
        return interaction.deferReply();
      }

      const fileName = attachment.name;
      const filePath = `./${fileName}`;

      try {
        await fs.promises.access(filePath);
        await fs.promises.unlink(filePath);
        console.log(`File ${fileName} already exists, replacing...`);
      } catch (err) {
        console.log(`File ${fileName} does not exist, uploading...`);
      }

      const fileStream = fs.createWriteStream(filePath);
      const fileRequest = await fetch(attachment.url);
      const fileBuffer = await fileRequest.arrayBuffer();
      fileStream.write(Buffer.from(fileBuffer));
      fileStream.end();

      interaction.deferReply();
      setTimeout(() => {
        interaction.editReply(`File ${fileName} uploaded successfully!`);
      }, 3000);
    } else {
      interaction.reply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
    }
  }
  //SEND MSG COMMAND CODE
  if (interaction.commandName === 'sendmsg') {
    if (authid.includes(username)) {
      try {
        await interaction.deferReply();
        const message = interaction.options.getString('msg');
        const channel = client.channels.cache.get(authJson['guild-aleart']); // apne channel ID ko yahaan replace karein
        if (!channel) return interaction.editReply('Error: Channel not found!');
        channel.send(`@everyone\n ${message}`);
        interaction.editReply('Message sent successfully!');
      } catch (error) {
        console.error(error);
        interaction.editReply('Error: Unable to send message!');
      }
    } else {
      interaction.reply({ content: 'Error: You do not have permission to use this command!', ephemeral: true });
    }
  }
  //Guild info command code
  if (interaction.commandName === 'guild_info') {
    try {
      await interaction.deferReply();
      const guildName = process.env.name;
      const guildLevel = process.env.level;
      let guildLeader = '';
      let totalPlayers = 0;
      let bannedPlayers = 0;
      const data = fs.readFileSync(filePath, 'utf8').split('\n');
      const headers = data[0].split(',');
      const columns = {
        'UID': headers.findIndex(header => header.trim().toLowerCase() === 'uid'),
        'PLAYER NAME': headers.findIndex(header => header.trim().toLowerCase() === 'player name'),
        'RANK': headers.findIndex(header => header.trim().toLowerCase() === 'rank'),
        'STATUS': headers.findIndex(header => header.trim().toLowerCase() === 'status'),
        'KICKED SCORE': headers.findIndex(header => header.trim().toLowerCase() === 'kicked score'),
      };
      if (Object.values(columns).includes(-1)) {
        await interaction.editReply('Error: One or more columns not found!');
        return;
      }
      data.slice(1).forEach((row) => {
        const rowData = row.split(',');
        if (rowData.length > columns['RANK'] && rowData[columns['RANK']].trim().toLowerCase() === 'leader') {
          if (rowData.length > columns['PLAYER NAME']) {
            guildLeader = rowData[columns['PLAYER NAME']].trim();
          }
        }
        if (rowData.length > columns['STATUS'] && rowData[columns['STATUS']].trim().toLowerCase() === 'in guild') {
          totalPlayers++;
        }
        if (rowData.length > columns['KICKED SCORE'] && rowData[columns['KICKED SCORE']].trim() >= 10) {
          bannedPlayers++;
        }
      });
      const reply = ` ❤️‍🔥**Guild Name:** ${guildName}\n\n⚓**Guild Level:** ${guildLevel}\n\n👤**Guild Leader:** ${guildLeader}\n\n🎮**Total Players:** ${totalPlayers}\n\n🚫**Banned Players:** ${bannedPlayers} `;
      await interaction.editReply(reply);
    } catch (error) {
      console.error(error);
      await interaction.editReply('Error: Unable to retrieve guild info!');
    }
  }
  //end line

});

// cron code

const cron = require('cron');
process.env.TZ = 'Asia/Kolkata';

const job = new cron.CronJob('0 * * * *', async () => {
  const today = new Date();
  const hour = today.getHours();
  if (hour >= 18) {
    const day = today.getDay(); // 1 = Monday, 2 = Tuesday, ...
    if (day === 1) {
      const csvFile = guildPath;
      const csvData = [];
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          csvData.push(row);
        })
        .on('end', () => {
          csvData.forEach((row) => {
            row['LAST TOTAL POINTS'] = row['CURRENT TOTAL POINTS'];
            row['POINTS'] = 'O'
            row['POINTS LIMIT'] = '10000';
          });
          const headers = Object.keys(csvData[0]);
          const data = [headers.join(',')].concat(csvData.map((row) => Object.values(row).join(',')));
          fs.writeFileSync(csvFile, data.join('\n'));
          console.log('LAST TOTAL POINTS updated successfully!');
          const channel = client.channels.cache.get('1333423039106519061');
          if (channel) {
            channel.send('LAST TOTAL POINTS IS UPDATED SUCESSFULLY!');
          } else {
            console.error('Channel not found!');
          }
        });
    } else {
      console.log("Today's not Monday");
    }
  } else {
    console.log("Time is less than 6");
  }
});

job.start();
//seccond code
const cronnn = require('cron');
const { graphics } = require('systeminformation');
process.env.TZ = 'Asia/Kolkata';

const jobb = new cronnn.CronJob('* * * * * *', async () => {
  const csvFile = passPath;
  const csvData = [];
  let clearedOTPs = 0;
  let totalOTPs = 0;

  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (row) => {
      csvData.push(row);
    })
    .on('end', () => {
      const currentTime = moment();
      const headers = Object.keys(csvData[0]);
      const data = [];

      csvData.forEach((row) => {
        totalOTPs++;
        const time = moment(row.Time, 'HH:mm:ss');
        const timeDiff = currentTime.diff(time, 'minutes');
        if (timeDiff >= 10 && row.OTP !== '') {
          row.OTP = '';
          clearedOTPs++;
          console.log(`OTP cleared for ${row.UID}`);
        }
        if (row.Status === 'NOT VERIFIED' && timeDiff >= 10) {
          data.push('');
        } else {
          data.push([row.User_ID, row.UID, row.Password, row.Your_Email_Id, row.OTP, row.Time, row.Status, row.New_Password, row.Forgot_Status, row.Purpose, row.Old_User_ID].join(','));
        }
      });

      data.unshift(headers.join(','));

      fs.writeFileSync(csvFile, data.join('\n'));

      if (clearedOTPs === 0) {

      } else {
        console.log(`Cleared ${clearedOTPs} OTPs out of ${totalOTPs}.`);
      }
    });
});
jobb.start();

client.login(token);