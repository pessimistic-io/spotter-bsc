const $=s=>document.querySelector(s)

if (!ethereum) alert('metamask is not installed')

let CHAIN_ID=Number(null) // just declaration

const w3 = new Web3(ethereum)

const BACKEND_URL = 'https://i2pvo72456.execute-api.us-east-1.amazonaws.com/v0/dapp'

const AAVE_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' // ETH mainnet
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'// ETH mainnet

const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' // BSC mainnet

let state = null // SPA logic

window.spotter={}// app-related data

let recovery_nonce=0 // filled on switching accounts
let recovery_balance=0 // filled on switching accounts

const round=p=>num=>Math.round((num+Number.EPSILON)*(10**p))/(10**p)
const part=n=>Math.round(n/10)

const maxuint256="115792089237316195423570985008687907853269984665640564039457584007913129639935"

const button_react=(el,status)=>el.classList.add(Boolean(status)?'button-success':'button-warning')

const approve=x=>async e=>{

    e.stopImmediatePropagation();

    const self = (56==CHAIN_ID)?$('button#approve_pancake'):$('button#approve_transfer')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    let asset = new w3.eth.Contract(abis.erc20, x.contract_address)

    asset.methods
        .approve(get_recovery_address(), maxuint256)
        .send({ from: spotter.user_address }, (err, res) =>{
            button_react(self,res)
        })

}

const send_eth=x=>async e=>{

    e.stopImmediatePropagation();

    const self = $('button#send_eth')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    let fees = Number($('#eth_amount').value)

    // console.log(fees)

    let tx_hash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: ethereum.selectedAddress,
            to: get_recovery_address(),
            value: Number(fees*10**18).toString(16),
        }],
    }).catch(e=>{
        self.classList.add('button-warning')
    })

    button_react(self,tx_hash)

}

const send_bnb=x=>async e=>{


    e.stopImmediatePropagation();

    const self = $('button#send_bnb')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    let fees = Number($('#bnb_amount').value)

    // console.log(fees)

    let tx_hash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
            from: ethereum.selectedAddress,
            to: get_recovery_address(),
            value: Number(fees*10**18).toString(16),
        }],
    }).catch(e=>{
        self.classList.add('button-warning')
    })

    button_react(self,tx_hash)

}

const get_token_transfer_from_tx=x=>{

    // console.log([spotter.user_address, get_recovery_address(), x])

    let asset = new w3.eth.Contract(abis.erc20, x.contract_address)

    return asset.methods.transferFrom(
        spotter.user_address,
        get_recovery_address(),
        x.balance)
    .encodeABI()

}

const get_approve_tx=x=>{

    let asset = new w3.eth.Contract(abis.erc20, x.contract_address)

    return asset.methods.approve(
        AAVE_POOL,
        x.balance)
    .encodeABI()

}

const UNDERLYINGS={
    '0x7efaef62fddcca950418312c6c91aef321375a00':['0x55d398326f99059ff775485246999027b3197955','0xe9e7cea3dedca5984780bafc599bd69add087d56']
}// so hard, this is relation between the cake lp abd to stablecoins on bsc


const get_liquidation_tx=x=>{

    let router = new w3.eth.Contract(abis.pancake_router, PANCAKE_ROUTER)


    return router.methods.removeLiquidity(
        UNDERLYINGS[x.contract_address][0], // tokenA
        UNDERLYINGS[x.contract_address][1], // tokenB
        x.balance, // liqudity
        0, // amountAmin
        0, // amountBmin
        spotter.user_address, // to
        maxuint256// deadline
        )
    .encodeABI()

}

const get_withdraw_tx=x=>{

    let pool = new w3.eth.Contract(abis.aave_pool, AAVE_POOL)

    return pool.methods.withdraw(
        WETH_ADDRESS, // asset
        x.balance, //amount
        spotter.user_address // to
    )
    .encodeABI()

}


const add_transaction = (type,s,x)=>{

    if (!spotter.transactions) spotter.transactions ={}

    spotter.transactions[type] = s

    if (3==Object.values(spotter.transactions).length){ // FIXME

        _post(x)
    }
}


const _post = async x=>{

    const $self = (56===Number(CHAIN_ID))?$('button#send_back_pancake'):$('button#send_back')

    $self.classList.add('button-processing')

    const data = {
        "protocol_address":x.contract_address,
        "user_address":spotter.user_address,
        "bundle":[
            '0x'+spotter.transactions.transfer,
            '0x'+spotter.transactions.approve,
            '0x'+spotter.transactions.remove_liquidity
        ]
    }

    console.log(data)

    fetch(BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(data)
    }).then(response=>{

        $self.classList.remove('button-processing')
        $self.classList.add('button-success')

        console.log(response)
    }).catch(e=>{
        console.error(e)

        $self.classList.remove('button-processing')
        $self.classList.add('button-warning')

    });
}


const get_mfpg = ()=>{

    // hardcode warning! FIXME

    if (56===CHAIN_ID) {

        return Number($('#set_GasPrice').value)
    }

    if (1===CHAIN_ID) {

        return Number($('#set_maxFeePerGas').value)
    }



}

const get_emergency_tx = tx=>{

    if (56===CHAIN_ID) {

        return Object.assign({
            chainId: CHAIN_ID,
            gasPrice: get_mfpg()*10**9,
            value : 0,
            // accessList: [],
        },tx)


    }

    return Object.assign({
        chainId: CHAIN_ID,
        maxFeePerGas: get_mfpg()*10**9,
        maxPriorityFeePerGas: part(get_mfpg()*10**9),
        value : 0,
        accessList: [],
    },tx)
}


const get_vrs = sig=>{

    const r = '0x' + sig.substring(2).substring(0, 64);
    const s = '0x' + sig.substring(2).substring(64, 128);
    const v = '0x' + sig.substring(2).substring(128, 130)

    return {v,r,s}

}


const encode_tx = async tx=>{

    // console.log(tx)

    // FeeMarketEIP1559Transaction logic is implemeted server-side

    let encoded_tx = await fetch('/API/TX/', {
        method: 'post',
        body: JSON.stringify(tx)
    })

    return await encoded_tx.text()
}

const encode_tx_message = async tx=>{

    console.log(tx)


    let message = await fetch('/API/TX_TO_SIGN/', {
        method: 'post',
        body: JSON.stringify(tx)
    })

    return await message.text()

}

function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

const sign_tx = async t=>{

    const msg = await encode_tx_message(t)

    // console.log(msg)

    const signature = await ethereum.request({
        method: 'eth_sign',
        params: [get_recovery_address(), '0x'+msg],
      });

    console.log(signature)

    let {v,r,s} = get_vrs(signature)

    t.v = v
    t.r = r
    t.s = s

    const transaction = await encode_tx(t)

    return transaction
}

const sign_transfer=x=>async e=>{

    const self = $('button#sign_transfer')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    try {

        const t = get_emergency_tx({
            to: x.contract_address,
            data: get_token_transfer_from_tx(x),
            nonce: recovery_nonce,
            gasLimit: transfer_from_gas_estimation  //await get_bundle_gas_cost(x)[0]
        })

        add_transaction('transfer', await sign_tx(t),x)

        self.classList.add('button-success')

    } catch (e) {

        console.error(e)

        self.classList.add('button-warning')

    }

}

const sign_asset_approve=x=>async e=>{

    const self = $('button#sign_approve_asset_pancake')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    try {

        const t = get_emergency_tx({
            to: x.contract_address,
            data: get_approve_tx(x),
            nonce: recovery_nonce+1,
            gasLimit: pancake_approve_asset_gas_limit
        })

        add_transaction('approve',await sign_tx(t),x)

        self.classList.add('button-success')

    } catch (e) {

        console.error(e)

        self.classList.add('button-warning')

    }


}

const sign_withdraw = x=>async e=>{

    const self = $('button#sign_withdraw')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    try {

        const t = get_emergency_tx({
            to: AAVE_POOL,
            data: get_withdraw_tx(x),
            nonce: recovery_nonce+2,
            gasLimit: withdraw_gas_estimation
        })

        add_transaction('withdraw',await sign_tx(t),x)

        self.classList.add('button-success')

    } catch (e) {

        console.error(e)

        self.classList.add('button-warning')

    }

}


const sign_transfer_from_pancake=x=>async e=>{


    const self = $('button#sign_transfer_from_pancake')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    try {

        const t = get_emergency_tx({
            to: x.contract_address,
            data: get_token_transfer_from_tx(x),
            nonce: recovery_nonce, //+0
            gasLimit: pancake_transfer_from_gas_limit  //await get_bundle_gas_cost(x)[0]
        })

        add_transaction('transfer', await sign_tx(t),x)

        self.classList.add('button-success')

    } catch (e) {

        console.error(e)

        self.classList.add('button-warning')

    }

}

const sign_liquidation_pancake=x=>async e=>{


    const self = $('button#sign_liquidation_pancake')

    self.classList.remove('button-success')
    self.classList.remove('button-warning')

    try {

        const t = get_emergency_tx({
            to: PANCAKE_ROUTER,
            data: get_liquidation_tx(x),
            nonce: recovery_nonce+2, //+0
            gasLimit: pancake_remove_liquidity_gas_limit  //await get_bundle_gas_cost(x)[0]
        })

        add_transaction('remove_liquidity', await sign_tx(t),x)

        self.classList.add('button-success')

    } catch (e) {

        console.error(e)

        self.classList.add('button-warning')

    }

}



let pancake_transfer_from_gas_limit = 350000
let pancake_approve_asset_gas_limit = 55000
let pancake_remove_liquidity_gas_limit = 550000


let transfer_from_gas_estimation = 350000
let approve_asset_gas_limit      =  0 // not used in new version
let withdraw_gas_estimation      = 450000

const get_bundle_gas_cost = x=>{

    if (x.contract_name.toLowerCase().includes('pancake')) {

        return pancake_transfer_from_gas_limit
             + pancake_approve_asset_gas_limit
             + pancake_remove_liquidity_gas_limit
    }

    if (x.contract_name.toLowerCase().includes('aave')) {

        return transfer_from_gas_estimation
             + withdraw_gas_estimation
             + pancake_approve_asset_gas_limit
    }
}

const sum=arr=>arr.reduce((a,b)=>a+b,0)

const calculate_gasprice = x=>async e=>{

    const gas = get_bundle_gas_cost(x)

    const more_fee  = Number($('input#eth_amount').value)*10**9

    const fee  = more_fee + recovery_balance/10**9

    const mfpg = fee/gas

    $('input#set_maxFeePerGas').value = round(2)(mfpg)

    if (recovery_balance) {
        $('div#recovery_fee_sum').innerHTML=`Total fee sum: ${round(5)(fee/10**9)} ETH`
    }

    if (Number($('input#eth_amount').value)>0){
        $('button#send_eth').classList.remove('button-success')
        $('button#send_eth').removeAttribute('disabled')
    } else {
        if (recovery_balance) {
            $('button#send_eth').classList.add('button-success')
            $('button#send_eth').setAttribute('disabled',true)
        }
    }
}
const set_max_fee = x=>{

    if (recovery_balance>0) {
        let mfpg = recovery_balance/get_bundle_gas_cost(x)
        $('#set_maxFeePerGas').value=round(2)(mfpg/10**9)
    } else {
        $('#set_maxFeePerGas').value=0
    }

}

const calculate_fee = x=>async e=>{

    let unit=null
    let button=null
    let input =null
    let fee_sum = null


    if (56===CHAIN_ID) {

        input=$('input#bnb_amount')
        button=$('button#send_bnb')
        fee_sum=$('div#recovery_fee_sum_bnb')
        unit='BNB'
    }

    if (1===CHAIN_ID) {

        input=$('input#eth_amount')
        button=$('button#send_eth')
        fee_sum=$('div#recovery_fee_sum')
        unit='ETH'

    }


    const gas = get_bundle_gas_cost(x)

    const fee  = (gas*get_mfpg()*10**9)

    const eth_needed = fee-recovery_balance

    if (recovery_balance) {
        fee_sum.innerHTML=`Total fee sum: ${round(5)(fee/10**18)} ${unit}`
    }

    if (eth_needed>0) {
        button.classList.remove('button-success')
        button.removeAttribute('disabled')

        input.value = round(5)((fee-recovery_balance)/10**18)
    } else {
        input.value = 0
        button.classList.add('button-success')
        button.setAttribute('disabled',true)

    }
}

const show_protection_form = x=>{

    // console.log(x)

    spotter.x=x

    let f = $('form#protection_aave')
    f.style.display='block'

    $('form#protection>legend').innerHTML = `Creating an emergency retrive for <b>${parse_balance(x)}</b> ${x.contract_ticker_symbol} for ${spotter.user_address}`

    $('button#approve' ).addEventListener('click',approve(x))
    $('button#send_eth').addEventListener('click',send_eth(x))
    $('button#sign_transfer').addEventListener('click',sign_transfer(x))
    $('button#sign_withdraw').addEventListener('click',sign_withdraw(x))

    $('input#eth_amount').addEventListener('input',calculate_gasprice(x))
    $('input#set_maxFeePerGas').addEventListener('input',calculate_fee(x))


}

const show_protection_form_pancake = x=>{

    console.log(x)

    spotter.x=x

    let f = $('form#protection_pancake')
    f.style.display='block'

    $('form#protection_pancake>legend').innerHTML = `Creating an emergency retrive for <b>${parse_balance(x)}</b> ${x.contract_ticker_symbol} for ${spotter.user_address}`

    $('button#approve_pancake' ).addEventListener('click',approve(x))
    $('button#send_bnb').addEventListener('click',send_bnb(x))


    $('button#sign_transfer_from_pancake').addEventListener('click',sign_transfer_from_pancake(x))
    $('button#sign_approve_asset_pancake').addEventListener('click',sign_asset_approve(x))
    $('button#sign_liquidation_pancake').addEventListener('click',sign_liquidation_pancake(x))

    $('input#bnb_amount').addEventListener('input',calculate_gasprice(x))
    $('input#set_GasPrice').addEventListener('input',calculate_fee(x))

}

const get_recovery_address=()=>{

    if (Boolean(spotter.recovery_address)
    && !Boolean($('input#recovery_address').value)) {

        //dirt!
        $('input#recovery_address').value = spotter.recovery_address
    }

    return spotter.recovery_address||$('input#recovery_address').value
}

const on_accounts_change = async accounts => {

    const wallet = accounts[0]

    let is_main_acc = wallet == spotter.user_address

    let buttons_first = []
    let buttons_second =[]


    if (56===CHAIN_ID) {

        buttons_first = [
            $('button#approve_pancake'),
            $('button#send_bnb')
            ]

        buttons_second = [
            $('button#sign_transfer_from_pancake'),
            $('button#sign_approve_asset_pancake'),
            $('button#sign_liquidation_pancake')
            ]
    }

    if (1===CHAIN_ID) {

        buttons_first = [
            $('button#approve_transfer'),
            $('button#send_eth')
            ]
        buttons_second = [
            $('button#sign_transfer'),
            $('button#sign_withdraw')
            ]
    }

    switch (state) {

        case null:

            spotter.user_address = wallet
            render_first()
            break

        case 'started':

            if (is_main_acc) {

                buttons_first.forEach(b=>b.removeAttribute('disabled'))
                buttons_second.forEach(b=>b.setAttribute('disabled', true))


            } else { // switched to RECOVERY WALLET

                buttons_first.forEach(b=>b.setAttribute('disabled', true))
                buttons_second.forEach(b=>b.removeAttribute('disabled'))

                $('input#recovery_address').value = wallet
                $('input#recovery_address_bnb').value = wallet

                recovery_nonce = await w3.eth.getTransactionCount(wallet)
                recovery_balance = await w3.eth.getBalance(wallet)

                if (recovery_balance>0) {
                    $('div#recovery_balance').innerHTML= `Current balance of recovery wallet is ${round(5)(recovery_balance/10**18)} ETH`
                }

                if (56==CHAIN_ID) {
                    $('div#recovery_balance_bnb').innerHTML= `Current balance of recovery wallet is ${round(5)(recovery_balance/10**18)} BNB`

                }

                set_max_fee(spotter.x)

                calculate_fee(spotter.x)()
            }

            break
    }
}



const click_token = x=>e=>{

    state = 'started'

    $('#all_tokens').style.visibility = 'hidden'


    if (x.contract_name.toLowerCase().includes('pancake')) {

        show_protection_form_pancake(x)


    } else {

        show_protection_form(x)

    }

}

const supported_chains = {
    1:'Ethereum mainnet',
    56: 'Binance Smart Chain Mainnet',
    97: 'Binance Smart Chain TESTNET'
}

const initial_loading = async e=> {

    CHAIN_ID = Number(await ethereum.request({ method: 'eth_chainId' }))

    const name = supported_chains[CHAIN_ID]

    $('note#chain').innerHTML=`Chain of operations: ${name}`

    window.spotter = {}

    $('button#connect').setAttribute('disabled',true)

    let accounts = await ethereum.request({ method: 'eth_requestAccounts' })

    const multiple_connect = Boolean(accounts.length>1)

    if (multiple_connect) {

        console.log(`got ${accounts.length} addresses!`)

        for (let i = accounts.length - 1; i >= 0; i--) {
            nonces[i] =  await w3.eth.getTransactionCount(accounts[i])
        }

        const older = nonces.indexOf(Math.max(...nonces))


        spotter.user_address = accounts[older]

        if (accounts.length==2) {

            let freshman = (0==older)?1:0
            spotter.recovery_address = accounts[freshman]

        }

    } else {

        spotter.user_address = accounts[0]
    }

    await render_first()
}

const parse_balance = x=>{

    const balance = Number(BigInt(x.balance))/(10**x.contract_decimals)

    return round(5)(balance)
}

// const clean_list = l=>l.filter(el=>{

//     let spam = el.meta.symbol.includes('visit')
//             || el.meta.symbol.includes('Visit')

//     return !spam
// })

const not=f=>x=>!f(x) // single argument only

// const is_aave

const split_token_list=tokens=>{

    let is_supported=x=>x.contract_name.toLowerCase().includes('aave')
                     || x.contract_name.toLowerCase().includes('pancake')

    return {
        supported: tokens.filter(is_supported),
        rest: tokens.filter(not(is_supported))
    }
}

const copy=x=>Object.assign({},x) // not deep


const draw_active_asset = container=>x=>{

    const li = document.createElement('li')

    console.log(x)

    li.innerHTML = `<b>${parse_balance(x)}</b> ${x.contract_ticker_symbol}`

    const cta = document.createElement('button')
    cta.innerText = 'protect asset'
    cta.classList.add('pure-button')
    cta.classList.add('button-secondary')
    cta.addEventListener('click', click_token(copy(x)))

    li.append(cta)

    container.append(li)

}

const draw_unsupported_asset = container=>x=>{

    const li = document.createElement('li')

    li.innerHTML = `<b>${parse_balance(x)}</b> ${x.contract_ticker_symbol}`

    container.append(li)
}



const render_first = async ()=>{

    $('legend#me').innerText = `User address: ${spotter.user_address}`

    const url = `/API/tokens/${CHAIN_ID}/${spotter.user_address}`

    const r = await fetch(url)
    const {items} = await r.json()

    tokens = split_token_list(items)

    const active_list = $('ul.active')
    active_list.innerHTML=""

    const inactive_list = $('ul.inactive')
    inactive_list.innerHTML=""

    tokens.supported.forEach(draw_active_asset(active_list))
    tokens.rest.forEach(draw_unsupported_asset(inactive_list))

    $('button#connect').setAttribute('hidden',true)

}

ethereum.on('accountsChanged',on_accounts_change)
ethereum.on('chainChanged',initial_loading)


$('button#connect').addEventListener('click', initial_loading)

initial_loading(0)
