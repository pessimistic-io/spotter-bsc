# Spotter Saver
We present first of a kind tool to protect the funds a user has on any protocol in Binance Smart Chain against a hack of that protocol. The tool monitors the onchain activity that precedes a hack. Once the tool decides that the risk of an exploit of a given protocol is critical, it automatically withdraws the user’s funds from that protocol before the hack occurs. The tool is non-custodial and doesn’t keep user’s keys or funds.

## Overview
The product consists of two main components. 
The first one — **Spotter** — is our hack prediction engine that we are developing independently of the hackathon. 
The second one — **Saver** — is a customer facing DApp that we developed **specifically for Zero2Hero hackathon. 
Currently Saver works only for BSC, and only this part is open-sourced in this repo.**

## Spotter
Spotter is a proprietary solution that analyzes on-chain and off-chain activity using static analysis and machine learning techniques. The basic idea is the following: 
53% of hacks are performed in several steps: Funding, Preparation, Hack, Money laundering.
**Spotter identifies exploits during the first steps, before they even land on the blockchain.**
It looks for the new contracts in the mempool, analyzes them, and triggers **Saver** in case it detects the high risk for the protocol.

## Saver
Saver is a basic DApp that works as follows:
Users go to the DApp, select the assets they want to protect, and sign withdrawal transactions which then are stored on Saver’s backend.
If Spotter detects a malicious activity on the relevant protocol, Saver broadcasts them to BSC, withdrawing the funds from the protocol back to the users’ accounts.
In the future, Users can optionally utilize a wallet plug-in to enhance UX.

## Images of the Demo

### 1. The start screen of Saver
Saver asks the user to connect their wallet and automatically detects that user has deposited some funds on Pancake Swap as a liquidity provider.

![Start screen of Saver](https://github.com/pessimistic-io/spotter-saver/blob/assets/images/img1.png)

---

### 2. The setup screen of Saver 
User goes through the setup. Saver needs the user to create the second wallet which is used exclusively for the defense purposes. *The second account is required so the user doesn’t have to re-sign the transactions every time they perform any on-chain activity which increases the nonce and hence deprecates the “defense” transactions.*
The user then approves the transfer of the funds to the retrieval address, and signs the transactions that will then be used to withdraw their funds from Pancake Swap.

![Setup screen of Saver](https://github.com/pessimistic-io/spotter-saver/blob/assets/images/img2.png)

---

### 3. Emulation of an attack on Pancake Swap
We create and deploy the smart contract which emulates an attack on Pancake Swap pool. The smart contract is of course harmless and is created only to trigger Spotter. It is an obvious False Positive reaction which is impossible in production. We temporarily allow it for the purposes of demonstration.

![Emulation of an attack](https://github.com/pessimistic-io/spotter-saver/blob/assets/images/img3.png)

---

### 4. Spotter reacts to the “attack”
Spotter telegram bot indicates that there is an attack that soon will impact Pancake Swap.

![Spotter reacts to the “attack”](https://github.com/pessimistic-io/spotter-saver/blob/assets/images/img4.png)

---

### 5. Saver broadcasts the withdrawal transaction
The transaction is mined before the hacker activates the exploit.

![Mined withdrawal transaction](https://github.com/pessimistic-io/spotter-saver/blob/assets/images/img5.png)

---

### 6. The user’s funds are safe!!!

