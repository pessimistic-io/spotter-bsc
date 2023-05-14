const connect = require('connect')
const http = require('http')
const rlp = require('@ethereumjs/rlp')

const axios = require('axios')

const app = connect()

const jsonBody = require("body/json")
const textBody = require("body")

// parse request bodies into req.body
const bodyParser = require('body-parser')
app.use(bodyParser.json({strict:false}))

const serveStatic = require('serve-static')
serve = serveStatic('public', { index: ['index.html']})

const { Alchemy, Network } = require("alchemy-sdk")
const {createServer} = require('http-server')
const keyFileStorage = require('key-file-storage')//.default
const {Transaction, FeeMarketEIP1559Transaction} =  require('@ethereumjs/tx')
const {bigIntToUnpaddedBuffer} =  require('@ethereumjs/util')

require('dotenv').config()

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_KEY,
  network: Network.ETH_MAINNET,
});

const kfs = keyFileStorage('./cache')

const cache = f=>async a=>{

  let k = `${f.name}__${a}`

  if (!(k in kfs)) kfs[k]=await f(a)

  return Promise.resolve(kfs[k])
}

const get_meta_data = async a=>await alchemy.core.getTokenMetadata(a)

const parse_balances = async b=>{

  for (i in b) {
    let n=b[i]
    // console.log(n)
    n.meta = await cache(get_meta_data)(n.contractAddress)
    b.balance = Number(BigInt(n.tokenBalance))/(10**n.meta.decimals)
  }
  return b
}

const safe_error = e=>{

  console.log(e)
  console.log('we have an error')

  return {}
}

const NODEREAL_TOKEN_BALANCES = 'https://open-platform.nodereal.io/6b272daf679c4ba1aca03563549272ad/covalenthq/'


const get_balances = async (chain,address)=>{//

  const chain_name = {
    1: 'eth-mainnet',
    56: 'bsc-mainnet'
  }[chain]

  try {

    const res = await axios
      .get(`${NODEREAL_TOKEN_BALANCES}/v1/${chain_name}/address/${address}/balances_v2/`)

    return res.data
  }
  catch (e) { return safe_error(e) }

}


const encode_tx = b=>{

  let tx=null

  if (1!==Number(b.chainId)) {

    // see eip-155
    if (b.v) b.v=(Number.parseInt(b.v,16)-27)+35+Number(b.chainId) * 2

    // console.log(b)
    console.log('"normal" transaction')

    tx=Transaction.fromTxData(b,{})

    // console.log(tx.this.activeCapabilities)

    // console.log(tx)

    return tx.serialize().toString('hex')
  }

  if (b.v) b.v=Number.parseInt(b.v,16)-27

  tx = FeeMarketEIP1559Transaction.fromTxData(b,{})

  return tx.serialize().toString('hex')

}


// const tttt = require('./tx.json')

// // console.log(tttt)

// let y = encode_tx(tttt)

// console.log(y)

// process.exit()

app.use(async (req,res,next)=>{
  console.log(req.url)
  next()
})

app.use(async (req,res, next)=>{

    let path = req.url.split('/')

    if (path[1]=='API') {

      if (path[2]=='RLP'){

        jsonBody(req, res, (e,b)=>{

            const y = Buffer.from(rlp.encode(b)).toString('hex')
            res.end(y)
        })

      }

      if (path[2]=='TX_TO_SIGN'){

        jsonBody(req, res, (e,b)=>{

            if (e) {console.error(e); res.end(''); return}

            // console.log(b)

            let y=null

            if (56==Number(b.chainId)) {

              y= Transaction
                .fromTxData(b,{})
                .getMessageToSign()
                .toString('hex')


            } else {

              y= FeeMarketEIP1559Transaction
              .fromTxData(b,{})
              .getMessageToSign()
              .toString('hex')


            }


            console.log(b,y)

            res.end(y)
          })
      }

      if (path[2]=='TX') {

          // console.log(req)
          jsonBody(req, res, (e,b)=>{

            if (e) {console.error(e); res.end(''); return}

            const y= encode_tx(b)

            console.log(b,y)

            res.end(y)
          })
      }

      if (path[2]=='tokens') {

        const chain = Number(path[3])

        const address = path[4]

        const balances = await get_balances(chain, address)

        res.end(JSON.stringify(balances.data))

      }

    } else {

      next()
    }
  })

app.use(serve)

//create node.js http server and listen on port
http.createServer(app).listen(process.env.PORT)

console.log(`http server listening on port ${process.env.PORT}`)
