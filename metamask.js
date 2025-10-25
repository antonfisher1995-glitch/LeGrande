let currentAccount = null;
let tokenDecimals = 18, tokenSymbol = "TOKEN";
const resultBox = document.getElementById("result");
const walletInfo = document.getElementById("walletInfo");
const addressInput = document.getElementById("address");
const addressList = document.getElementById("addressList");

// ===== Local Storage Helpers =====
const STORAGE_KEY = "metamaskApp";
function loadState(){
 return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}
function saveState(state){
 localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function getRecentAddresses(){
 const s = loadState();
 return s.recentAddresses || [];
}
function addRecentAddress(addr){
 let s = loadState();
 s.recentAddresses = s.recentAddresses || [];
 if (!s.recentAddresses.includes(addr)){
   s.recentAddresses.unshift(addr);
   if (s.recentAddresses.length > 5) s.recentAddresses.pop(); // keep max 5
 }
 saveState(s);
 renderAddressList();
}
function saveCurrentAccount(account){
 let s = loadState();
 s.lastAccount = account;
 saveState(s);
}
function getLastAccount(){
 const s = loadState();
 return s.lastAccount;
}

// ===== UI Setup =====
document.getElementById("transferType").addEventListener("change", e=>{
 document.getElementById("tokenSection").style.display = e.target.value === "TOKEN" ? "block":"none";
});
document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("sendBtn").addEventListener("click", sendTx);
addressList.addEventListener("change", ()=>{
 addressInput.value = addressList.value;
});

// Load last account and recent addresses on page load
window.addEventListener("DOMContentLoaded", ()=>{
 const last = getLastAccount();
 if (last){
   walletInfo.innerHTML = `Last wallet: ${last}`;
 }
 renderAddressList();
});

function renderAddressList(){
 const list = getRecentAddresses();
 addressList.innerHTML = "";
 const def = document.createElement("option");
 def.textContent = "Select recent address (optional)";
 def.value = "";
 addressList.appendChild(def);
 list.forEach(addr=>{
   const opt = document.createElement("option");
   opt.value = addr;
   opt.textContent = addr.slice(0,6)+"..."+addr.slice(-4);
   addressList.appendChild(opt);
 });
}

// ===== Core MetaMask Logic =====
async function connectWallet(){
 if (!window.ethereum) return update("MetaMask not detected.");
 try{
   const accs = await ethereum.request({method:"eth_requestAccounts"});
   currentAccount = accs[0];
   saveCurrentAccount(currentAccount);
   update(`✅ Connected: <b>${currentAccount}</b>`);
   const bal = await ethereum.request({method:"eth_getBalance",params:[currentAccount,"latest"]});
   const eth = (parseInt(bal,16)/1e18).toFixed(6);
   walletInfo.innerHTML = `💰 Balance: ${eth} ETH`;
 }catch(e){update("❌ "+e.message);}
}

async function sendTx(){
 const type = document.getElementById("transferType").value;
 if (type === "ETH") await sendETH();
 else await sendToken();
}

async function sendETH(){
 const to = addressInput.value.trim();
 const amt = parseFloat(document.getElementById("amount").value);
 if (!to || !amt) return update("⚠️ Fill address and amount.");
 try{
   const value = "0x"+(BigInt(Math.floor(amt*1e18)).toString(16));
   const tx = await ethereum.request({
     method:"eth_sendTransaction",
     params:[{from:currentAccount,to,value}]
   });
   addRecentAddress(to);
   update(`✅ ETH Sent!<br>TX: <a href="https://etherscan.io/tx/${tx}" target="_blank">${tx}</a>`);
 }catch(e){update("❌ "+e.message);}
}

async function sendToken(){
 const to = addressInput.value.trim();
 const amt = parseFloat(document.getElementById("amount").value);
 const tokenAddr = document.getElementById("tokenAddress").value.trim();
 if (!to || !amt || !tokenAddr) return update("⚠️ Fill all fields.");
 try{
   const value = BigInt(Math.floor(amt * 10 ** tokenDecimals));
   const data = "0xa9059cbb" + to.replace("0x","").padStart(64,"0") + value.toString(16).padStart(64,"0");
   const tx = await ethereum.request({
     method:"eth_sendTransaction",
     params:[{from:currentAccount,to:tokenAddr,data}]
   });
   addRecentAddress(to);
   update(`✅ Sent ${amt} ${tokenSymbol}<br>TX: <a href="https://etherscan.io/tx/${tx}" target="_blank">${tx}</a>`);
 }catch(e){update("❌ "+e.message);}
}

function update(html){ resultBox.innerHTML = html; }