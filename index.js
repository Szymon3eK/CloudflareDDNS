const axios = require("axios").default;
const config = require('./config.json');
var cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const {infocommand} = require('./info.js');

const bot = new TelegramBot(config.telegram.token, {polling: true});

console.log(' =================== DDNS CLOUDFLARE =================== \n Wait 10 seconds \n \n \n')

function cloudflareSeeDNSip() {
  var ips = [];

  return axios.request({
    method: "GET",
    url: `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zone}/dns_records/`,
    headers: { "Content-Type": "application/json", "X-Auth-Email": config.cloudflare.email, "X-Auth-Key": config.cloudflare.apikey },
  }).then((res) => {

    try {
    res.data.result.forEach(element => {
      config.subdomains.forEach(configsubdomain => {
        if(element.name == configsubdomain.domain) {
          ips[ips.length] = element
        }
      })
    })
  } catch (error) {
    console.log(error)
  }

    return ips;
  })
}

function getMyIPAdress() {
  return axios.request({
    
    method: "GET",
    url: "https://api.ipify.org?format=json",
    headers: { "Content-Type": "application/json", "X-Auth-Email": "" },

  })
}

function cloudflareUpdateDNS(DNSip, ip) {

  if(DNSip.type == "A") {
    axios.request({
      method: "PUT",
      url: `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zone}/dns_records/${DNSip.id}`,
      headers: { "Content-Type": "application/json", "X-Auth-Email": config.cloudflare.email, "X-Auth-Key": config.cloudflare.apikey },
      data: {
        type: `${DNSip.type}`,
        name: `${DNSip.name}`,
        content: `${ip}`,
        ttl: `${DNSip.ttl}`,
        proxied: DNSip.proxied
      }
    }).then((res) => {
      bot.sendMessage(config.telegram.chatid, `(${DNSip.type}) DNS ${DNSip.name} zostal zmieniony ${ip}`)
    })
  }




}


setInterval(function() {
  getMyIPAdress().then(ip => {
    cloudflareSeeDNSip().then(DNSips => {
      DNSips.forEach(DNSip => {


        if(DNSip.content != ip.data.ip) {
          console.log(`DNS ${DNSip.name} jest nieaktualne (${new Date()}) (zmiana z ${DNSip.content} na ${ip.data.ip})`)
          cloudflareUpdateDNS(DNSip, ip.data.ip)
        }

      })
    })
  })
}, 5000)

bot.onText(/\/echo (.+)/, (msg, match) => {

  const chatId = msg.chat.id;
  const resp = match[1];

  infocommand(chatId, resp)

});
