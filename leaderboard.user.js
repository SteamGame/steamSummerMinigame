// ==UserScript==
// @name         Monster Minigame Leaderboard
// @namespace    https://github.com/SteamDatabase/steamSummerMinigame
// @version      1.0
// @description  Display leaderboards from http://steamga.me
// @match        *://steamcommunity.com/minigame/towerattack*
// @match        *://steamcommunity.com//minigame/towerattack*
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/leaderboard.user.js
// @downloadURL  https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/leaderboard.user.js
// ==/UserScript==
//NOTE: This REQUIRES the use of GreaseMonkey or TamperMonkey
 
(function(w) {
    "use strict";
 
function initLeaderboard() {
 
    var container = document.createElement('div');
    container.id = 'leaderboard_wrapper';
    container.style.overflow = "hidden";
    container.style.height = "360px";
    container.style.width = "261px";
    container.style.display = "none";
    container.style.position = "relative";
    container.style.margin =  "50px 0 0 5px";
    container.style.padding = "5px";
 
    document.getElementById('col_right').appendChild(container);
 
    var leaderboard = document.createElement('table');
    leaderboard.id = 'leaderboard';
 
    var th = document.createElement('tr');
    th.style.fontSize = '11px';
    th.style.color = '#ddd';
 
    var thc = document.createElement('th');
    var thn = document.createElement('th');
    var thl = document.createElement('th');
    thc.appendChild(document.createTextNode('Rank'));
    thn.appendChild(document.createTextNode('Name'));
    thl.appendChild(document.createTextNode('Level'));
 
    th.appendChild(thc);
    th.appendChild(thn);
    th.appendChild(thl);
 
    leaderboard.appendChild(th);
 
    document.getElementById('leaderboard_wrapper').appendChild(leaderboard);
 
    var credit = document.createElement('div');
    credit.style.fontSize = "12px";
    credit.style.textAlign = "center";
    credit.innerHTML = 'Data by <a href="http://steamga.me/" style="color:#ddd;" alt="http://steamga.me/" target="_blank">steamga.me</a>';
 
    document.getElementById('leaderboard_wrapper').appendChild(credit);
 
    var toggler = document.createElement('div');
    toggler.id = "leaderboard_toggler";
    toggler.onclick = toggleLeaderboard
    toggler.style.position = 'absolute';
    toggler.style.bottom = "-48px";
    toggler.style.color = "black";
    toggler.style.textAlign = "center";
    toggler.style.width = '261px';
    toggler.style.cursor = "pointer";
    toggler.appendChild(document.createTextNode("Show Leaderboards"));
 
    document.getElementById('col_right').appendChild(toggler);
 
	if (!w.Leaderboard_Timer) {
		clearInterval(w.Leaderboard_Timer);
	}
    w.Leaderboard_Timer = setInterval(getLeaderboard, 1000 * 30);
	
	getLeaderboard();
}
 
function drawLeaderboardRoom(room) {
    var item = document.createElement('tr');
    item.className = 'leaderboard_item';
    item.style.height = '23px';
    item.style.fontSize = '10px';
 
    var num = document.createElement('td');
    num.appendChild(document.createTextNode('#' + room.position));
 
    var name = document.createElement('td');
    name.style.textAlign = 'center';
    name.appendChild(document.createTextNode(room.name));
 
    var level = document.createElement('td');
    level.style.textAlign = 'right';
    level.appendChild(document.createTextNode(room.level));
    
    if(room.id == w.g_GameID)
    {
        item.style.color = '#d4e157';
    }
 
    item.appendChild(num);
    item.appendChild(name);
    item.appendChild(level);
 
    document.getElementById('leaderboard').appendChild(item);
}
 
function getLeaderboard() {
    GM_xmlhttpRequest({
        method: "GET",
        url: "http://steamga.me/data/api/leaderboard.json",
        onload: function(response) {
            console.log('Downloading new leaderboard...');
            var elements = document.getElementsByClassName('leaderboard_item');
            while(elements.length > 0){
                elements[0].parentNode.removeChild(elements[0]);
            }
            var resp = JSON.parse(response.responseText);
            var leaderboard = Object.keys(resp).map(function (key) {
            	return resp[key];
            });
            leaderboard.sort(function(a, b) { 
                return b.level - a.level;
            });
            leaderboard.forEach(drawLeaderboardRoom);
        }
    });
}
 
function toggleLeaderboard() {
    var a = document.getElementById('leaderboard_wrapper'); 
    var b = document.getElementById('activitylog'); 
    var c = document.getElementById('leaderboard_toggler'); 
    if (a.style.display == 'block') {
        a.style.display = 'none'; 
        b.style.display = 'block'; 
        c.innerHTML = "Show Leaderboards";
    } else {
        a.style.display = 'block'; 
        b.style.display = 'none'; 
        c.innerHTML = "Show Activity";
    }
}
 
initLeaderboard();
}(window));
