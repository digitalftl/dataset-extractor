const ethers = require("ethers")
const axios = require('axios')
const fs = require('fs')
const Big = require("big.js")
var Web3 = require('web3');
var BN = require('bignumber.js');
const csv = require('csv-parser')
const { Parser } = require('json2csv');

let startblock = 16928389
let endblock = 	25980864

let currentBlock = startblock
let blocksPerTransaction = 9999
 
let inverval = null

let filterBy = 'user_Claim(uint256[] epochs)' //Competitor 3 BTC

var web3 =  null
let currentDate = '2022-1-1-0'
let currentDateArraty = []
let nextDateArray = []

let providers_url = [
	// 'http://127.0.0.1:8545'
	'https://bsc.getblock.io/mainnet/?api_key=69cdb87e-ea31-4c1d-ae35-687fff48c040',
	'https://bsc.getblock.io/mainnet/?api_key=28168a1f-d814-4fa5-b185-5442242261cd',		
	'https://bsc-dataseed1.ninicoin.io',		
	'https://bsc-dataseed2.ninicoin.io',		
	'https://bsc-dataseed4.ninicoin.io',		
	'https://bsc-dataseed3.ninicoin.io',		
	'https://bsc-dataseed3.defibit.io',		
	'https://bsc-dataseed4.defibit.io',		
	'https://bsc-dataseed1.binance.org',		
	'https://bsc-dataseed3.binance.org',		
	'https://bsc-dataseed1.defibit.io',		
	'https://bsc-dataseed2.binance.org',		
	'https://bsc-dataseed4.binance.org',		
	'https://bsc-dataseed2.defibit.io',		
	'https://bsc-dataseed.binance.org',		
	'https://bscrpc.com',		
	'https://bsc.mytokenpocket.vip',		
	'https://bscapi.terminet.io/rpc',		
	'https://bsc.nodereal.io',
]
 
let count = 0

let bsc_api = [		
	'API 1',
	'API 2',
	'API 3',
]		
let countapi = 0


const extractDataFromAPI = async () => {
	console.log(`Current BLOCK: ${currentBlock}, DATE: ${currentDate}`)
	web3 = new Web3(new Web3.providers.HttpProvider(providers_url[count]))	
	console.log("Connection Success")


	if (currentBlock > endblock) {
		clearInterval(inverval)
		return console.log('stop')
	}

	let url = `https://api.bscscan.com/api?module=account&action=txlist
	&address=CONTRACT_ADDRESS_HERE
	&startblock=${currentBlock}
	&endblock=${currentBlock + blocksPerTransaction}
	&page=1
	&offset=${blocksPerTransaction}
	&sort=asc
	&apikey=${bsc_api[countapi]}`

		async function getData() {
		let response = await axios(url)
		let data = response.data
	  
		if (!data || !data.result) {
		  console.error('data or data.result is null, resending the request...');
		  return await getData();
		}
	  
		let filter = data.result.filter(i => i.functionName === filterBy)
		console.log(`Transactions: ${filter.length}`);
	  
		let process = filter.map(async i => ({
		  hash: i.hash, 
		  value: await getValueByHash(i.hash), 
		  timeStamp: i.timeStamp, 
		  blockNumber: i.blockNumber, 
		  blockHash: i.blockHash,
		  stringDate: formatDate(i.timeStamp)
		}))
	  
		return { filter, process };
	  }
	  
	  let { filter, process } = await getData();
	  

	let newArrat = await Promise.all(process)
	let currentDateArratyTemp = newArrat.filter(i => i.stringDate === currentDate)
	currentDateArratyTemp = currentDateArratyTemp.filter(i => i.value > 0)
	let nextDateArrayTemp = newArrat.filter(i => i.stringDate !== currentDate)
	currentDateArraty = [...currentDateArraty, ...currentDateArratyTemp]

	if (nextDateArrayTemp.length)	{
		console.log(`WRITE IN FILE DATE: ${currentDate}`)
		await writeJSON(currentDateArraty)
		currentDate = nextDateArrayTemp[0].stringDate
		console.log(`NEW DATE ${currentDate}, BLOCK ${nextDateArrayTemp[0].blockNumber}`)
		currentDateArraty = nextDateArrayTemp


	}

	currentBlock = currentBlock + blocksPerTransaction
	count = providers_url.length -1 === count ? 0 : count + 1
	countapi = bsc_api.length -1 === countapi ? 0 : countapi + 1
}

const getValueByHash = async hash => {

	if (!hash) return false

	var tx = await getTransactionReceipt(hash);
	var totalClaim = new BN(0);
	for(var x = 0; x < tx.logs.length; x++){
			totalClaim = totalClaim.plus(tx.logs[x].data)
	}
	return parseFloat(totalClaim.div(new BN(10).pow(18))).toFixed(10)

}

async function getTransactionReceipt(hash) {
	let receipt;
	while (!receipt) {
	  try {
		receipt = await web3.eth.getTransactionReceipt(hash);
	  } catch (error) {
		console.error(error);
		await sleep(5000);
	  }
	}
	return receipt;
  }
  
  async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
  }

const writeJSON = async content =>  {

	let fileName = `exports/${currentDate}.json`
	let newData = JSON.stringify(content, null, 4)

	fs.writeFile(fileName, newData, (err) => {
		if (err) return console.log('write in file ERROR', err);
		console.log('WRITE DATA IN FILE SUCCESS');
	})

}

const formatDate = timestamp => {

	let date = new Date(timestamp * 1000)
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`

}

inverval = setInterval(() => extractDataFromAPI(), 5000)