require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const dns = require('dns')
const psl = require('psl')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const urlSchema = new mongoose.Schema({
  original: {
    type: String,
    required: true
  },
  short: Number
})

let Url = mongoose.model('URL', urlSchema)

function extractHostname(url) {
    var hostname;
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
}


app.post('/api/shorturl/new', urlencodedParser, (req, res) => {
  let inputUrl = req.body.url
  let newShort = 1;
    
  const dbEntry = (input, done) => {
    Url.countDocuments({}, (err, count) => {
      Url.countDocuments({original: inputUrl}, async (err, docCount) => { 
        try {
            if(docCount>0){
            Url.findOne({original: input}, (err, data) => {
            if (err) {
              done(err)
            } 
              done(null, data)
              newShort = data.short
              res.json({original_url: inputUrl, short_url: newShort})
          }); return }

          await Url.findOne({}).sort({short: -1}).exec((err, data) => {
             newShort = data.short + 1
            console.log(newShort)
          })

          await Url.create({ original: inputUrl, short: newShort }, (err, data) => {
            if (err) {
              done(err)
            } done(null, data)
          });
          return res.json({original_url: inputUrl, short_url: newShort})
        } catch {
          console.log('error')
        }

      }
      );
    })
  }
  let urlEdit = psl.get(extractHostname(inputUrl))
  
  dns.lookup(urlEdit, (err, value) => {
      if (value === null) {
        res.json({ error: 'invalid url' })
        return 
      } 
        dbEntry(inputUrl, ()=> {})
    }) 
    
})

app.get('/api/shorturl/new/:short_url?', async (req, res) => {
  try {
    const urlParams = await Url.findOne({short: req.params.short_url})
    if (urlParams) {
      return res.redirect(urlParams.original)
    } else {
      return res.status(404).json('No URL found')
    }
  } catch (err) {
      console.log(err);
      res.status(500).json('Server error')
    }
})



// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
