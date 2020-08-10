const fs = require('fs');
const RconConnection = require('./RconConnection.js')
const path = require('path');
const Server = require(path.join(__dirname, '../Lib/Entity/Server.js'))
const _Database = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const EventLogWatcher = require('./EventLogWatcher.js')
const ServerLogWatcher = require('./ServerLogWatcher.js')
const configuration = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`).toString())
const Webfront = require(path.join(__dirname, `../Webfront/Webfront.js`))

var Info = {
  Author: 'fed',
  Version: '0.2'
}

var Managers = []

console.log("============================================================")
console.log(`                 Node Server Manager v${Info.Version}`)
console.log(`                         By ${Info.Author}`)
console.log("============================================================")

class NSM {
  constructor (configuration) {
    this.Version = Info.Version
    this.Author = Info.Author
    this.IP = configuration.IP
    this.PORT = configuration.PORT
    this.PASSWORD = configuration.PASSWORD
    this.LOGFILE = configuration.LOGFILE
    this.LOGSERVER = configuration.LOGSERVER
    this.Server = null
    this.loadedPlugins = {}
    this.StartAsync()
  }
  async StartAsync() {

    // Connect to the server's rcon
    this.RconConnection = new RconConnection(this.IP, this.PORT, this.PASSWORD)
    this.Server = new Server(this.IP, this.PORT, this.RconConnection, new _Database())
    this._EventLogWatcher = this.LOGFILE ? new EventLogWatcher(this.LOGFILE, this.Server) : new ServerLogWatcher(this.LOGSERVER, this.Server)

    // Load plugins before initializing Server.Clients
    this.LoadPlugins()

    // Load Server Dvars
    await this.Server.setDvarsAsync()

    console.log(`Now watching \x1b[33m${this.Server.Hostname}\x1b[0m at \x1b[35m${this.IP}:${this.PORT}\x1b[0m`)

    // Load Client from status command
    await this.Server.loadClientsAsync()
    //this.Server.Broadcast('^3NSM^7 is now ^2ONLINE')

    // Start watching log
    this._EventLogWatcher.init()
  }
  LoadPlugins() {
    const directoryPath = path.join(__dirname, '../Plugins');
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
          return console.log('Unable to scan directory: ' + err);
      } 
      files.forEach( (file) => {
          console.log(`Loading plugin \x1b[33m${file}\x1b[0m for server ${this.Server.IP}:${this.Server.PORT}`)
          try {
            let plugin = require(path.join(__dirname, `../Plugins/${file}`))
            new plugin(this.Server, this)
          }
          catch (e) {
            console.log(`Error evaluating plugin \x1b[33m${file}\x1b[0m: \x1b[31m${e.toString()}\x1b[0m`)
          }
  
      });
    });
  }
}

configuration.Servers.forEach(config => {
  Managers.push(new NSM(config))
})

var web = new Webfront(Managers)
