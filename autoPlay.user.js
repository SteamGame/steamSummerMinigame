// ==UserScript==
// @name [SteamDB] Monster Minigame Script
// @namespace https://github.com/SteamDatabase/steamSummerMinigame
// @description A script that runs the Steam Monster Minigame for you.
// @version 4.4.8
// @match *://steamcommunity.com/minigame/towerattack*
// @match *://steamcommunity.com//minigame/towerattack*
// @grant none
// @updateURL https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js
// @downloadURL https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js
// ==/UserScript==

// IMPORTANT: Update the @version property above to a higher number such as 1.1 and 1.2 when you update the script! Otherwise, Tamper / Greasemonkey users will not update automatically.

(function(w) {
	"use strict";

// OPTIONS
var clickRate = 20;
var logLevel = 1; // 5 is the most verbose, 0 disables all log

var nukeBeforeReset = getPreferenceBoolean("nukeBeforeReset", true);

var enableAutoClicker = getPreferenceBoolean("enableAutoClicker", true);

var enableAutoUpgradeHP = getPreferenceBoolean("enableAutoUpgradeHP", true);
var enableAutoUpgradeClick = getPreferenceBoolean("enableAutoUpgradeClick", false);
var enableAutoUpgradeDPS = getPreferenceBoolean("enableAutoUpgradeDPS", false);

var removeInterface = getPreferenceBoolean("removeInterface", true); // get rid of a bunch of pointless DOM
var removeParticles = getPreferenceBoolean("removeParticles", true);
var removeFlinching = getPreferenceBoolean("removeFlinching", true);
var removeCritText = getPreferenceBoolean("removeCritText", false);
var removeAllText = getPreferenceBoolean("removeAllText", false);
var enableFingering = getPreferenceBoolean("enableFingering", true);
var disableRenderer = getPreferenceBoolean("disableRenderer", true);

var enableElementLock = getPreferenceBoolean("enableElementLock", true);

var enableAutoRefresh = getPreferenceBoolean("enableAutoRefresh", typeof GM_info !== "undefined");

var autoRefreshMinutes = 30;
var autoRefreshMinutesRandomDelay = 10;
var autoRefreshSecondsCheckLoadedDelay = 30;

// DO NOT MODIFY
var isAlreadyRunning = false;
var refreshTimer = null;
var currentClickRate = clickRate;
var lockedElement = -1;
var lastLevel = 0;
var trt_oldCrit = function() {};
var trt_oldPush = function() {};
var trt_oldRender = function() {};
var ELEMENTS = {};

var UPGRADES = {
	LIGHT_ARMOR: 0,
	AUTO_FIRE_CANNON: 1,
	ARMOR_PIERCING_ROUND: 2,
	DAMAGE_TO_FIRE_MONSTERS: 3,
	DAMAGE_TO_WATER_MONSTERS: 4,
	DAMAGE_TO_AIR_MONSTERS: 5,
	DAMAGE_TO_EARTH_MONSTERS: 6,
	LUCKY_SHOT: 7,
	HEAVY_ARMOR: 8,
	ADVANCED_TARGETING: 9,
	EXPLOSIVE_ROUNDS: 10,
	MEDICS: 11,
	MORALE_BOOSTER: 12,
	GOOD_LUCK_CHARMS: 13,
	METAL_DETECTOR: 14,
	DECREASE_COOLDOWNS: 15,
	TACTICAL_NUKE: 16,
	CLUSTER_BOMB: 17,
	NAPALM: 18,
	BOSS_LOOT: 19,
	ENERGY_SHIELDS: 20,
	FARMING_EQUIPMENT: 21,
	RAILGUN: 22,
	PERSONAL_TRAINING: 23,
	AFK_EQUIPMENT: 24,
	NEW_MOUSE_BUTTON: 25,
	CYBERNETIC_ENHANCEMENTS: 26,
	LEVEL_1_SENTRY_GUN: 27,
	TITANIUM_MOUSE_BUTTON: 28
};

var ABILITIES = {
	FIRE_WEAPON: 1,
	CHANGE_LANE: 2,
	RESPAWN: 3,
	CHANGE_TARGET: 4,
	MORALE_BOOSTER: 5,
	GOOD_LUCK_CHARMS: 6,
	MEDICS: 7,
	METAL_DETECTOR: 8,
	DECREASE_COOLDOWNS: 9,
	TACTICAL_NUKE: 10,
	CLUSTER_BOMB: 11,
	NAPALM: 12,
	RESURRECTION: 13,
	CRIPPLE_SPAWNER: 14,
	CRIPPLE_MONSTER: 15,
	MAX_ELEMENTAL_DAMAGE: 16,
	RAINING_GOLD: 17,
	CRIT: 18,
	PUMPED_UP: 19,
	THROW_MONEY_AT_SCREEN: 20,
	GOD_MODE: 21,
	TREASURE: 22,
	STEAL_HEALTH: 23,
	REFLECT_DAMAGE: 24,
	FEELING_LUCKY: 25,
	WORMHOLE: 26,
	LIKE_NEW: 27
};

var ENEMY_TYPE = {
	SPAWNER: 0,
	CREEP: 1,
	BOSS: 2,
	MINIBOSS: 3,
	TREASURE: 4
};

var BOSS_DISABLED_ABILITIES = [
	ABILITIES.MORALE_BOOSTER,
	ABILITIES.GOOD_LUCK_CHARMS,
	ABILITIES.TACTICAL_NUKE,
	ABILITIES.CLUSTER_BOMB,
	ABILITIES.NAPALM,
	ABILITIES.CRIT,
	ABILITIES.CRIPPLE_SPAWNER,
	ABILITIES.CRIPPLE_MONSTER,
	ABILITIES.MAX_ELEMENTAL_DAMAGE,
	ABILITIES.REFLECT_DAMAGE,
	ABILITIES.STEAL_HEALTH,
	ABILITIES.THROW_MONEY_AT_SCREEN
];

var CONTROL = {
	speedThreshold: 5000,
	rainingRounds: 250
};

var GAME_STATUS = {
	LOBBY: 1,
	RUNNING: 2,
	OVER: 3
};

// Try to disable particles straight away,
// if not yet available, they will be disabled in firstRun
disableParticles();

function s() {
	return w.g_Minigame.m_CurrentScene;
}

function firstRun() {
	advLog("Starting SteamDB's Steam Summer 2015 Monster Minigame Script.", 1);

	trt_oldCrit = s().DoCritEffect;
	trt_oldPush = s().m_rgClickNumbers.push;
	trt_oldRender = w.g_Minigame.Render;

	if(enableFingering) {
		startFingering();
	}

	if(enableElementLock) {
		lockElements();
	}

	if (enableAutoRefresh) {
		autoRefreshPage(autoRefreshMinutes);
	}

	toggleRenderer();

	// disable particle effects - this drastically reduces the game's memory leak
	disableParticles();

	// disable enemy flinching animation when they get hit
	if(removeFlinching && w.CEnemy) {
		w.CEnemy.prototype.TakeDamage = function() {};
		w.CEnemySpawner.prototype.TakeDamage = function() {};
		w.CEnemyBoss.prototype.TakeDamage = function() {};
	}

	if(removeCritText) {
		toggleCritText();
	}

	if(removeAllText) {
		toggleAllText();
	}

	var node = document.getElementById("abilities");

	if( node ) {
		node.style.textAlign = 'left';
	}

	if( removeInterface ) {
		node = document.getElementById("global_header");
		if (node && node.parentNode) {
			node.parentNode.removeChild( node );
		}
		node = document.getElementById("footer");
		if (node && node.parentNode) {
			node.parentNode.removeChild( node );
		}
		node = document.getElementById("footer_spacer");
		if (node && node.parentNode) {
			node.parentNode.removeChild( node );
		}
		node = document.querySelector(".pagecontent");
		if (node) {
			node.style.paddingBottom = 0;
		}
		document.body.style.backgroundPosition = "0 0";
	}

	// Add "players in game" label
	var titleActivity = document.querySelector( '.title_activity' );
	var playersInGame = document.createElement( 'span' );
	playersInGame.innerHTML = '<span id=\"players_in_game\">0/1500</span>&nbsp;Players in room<br>';
	titleActivity.insertBefore(playersInGame, titleActivity.firstChild);
	ELEMENTS.PlayersInGame = document.getElementById("players_in_game");

	// Fix alignment of acvititylog and expand list of active abilities on hover
	var abilities_extra_styles = document.createElement('style');
	abilities_extra_styles.type = 'text/css';
	abilities_extra_styles.textContent = '#activeinlanecontainer:hover {height:auto;background:rgba(50,50,50,0.9);padding-bottom:10px;position:absolute;z-index:1} #activeinlanecontainer:hover + #activitylog {margin-top:88px} #activitylog {margin-top: 20px}';
	document.getElementsByTagName('head')[0].appendChild(abilities_extra_styles);

	// space for option menu
	var options_menu = document.querySelector(".game_options");
	options_menu.style.height = "";
	var sfx_btn = document.querySelector(".toggle_sfx_btn");
	sfx_btn.style.marginLeft = "2px";
	sfx_btn.style.marginRight = "7px";
	sfx_btn.style.cssFloat = "right";
	sfx_btn.style.styleFloat = "right";
	var music_btn = document.querySelector(".toggle_music_btn");
	music_btn.style.marginRight = "2px";
	music_btn.style.cssFloat = "right";
	music_btn.style.styleFloat = "right";
	var leave_btn = document.querySelector(".leave_game_btn");
	leave_btn.style.display = "none";

	var info_box = document.querySelector(".leave_game_helper");
	document.querySelector(".pagecontent").style.padding = "0";
	options_menu.insertBefore(info_box, sfx_btn);

	info_box.innerHTML = '<b>OPTIONS</b>' + ((typeof GM_info !==  "undefined") ? ' (v' + GM_info.script.version + ')' : '') + '<br>Settings marked with a <span style="color:#FF5252;font-size:22px;line-height:4px;vertical-align:bottom;">*</span> requires a refresh to take effect.<hr>';

	// reset the CSS for the info box for aesthetics
	info_box.className = "options_box";
	info_box.style.backgroundColor = "#000000";
	info_box.style.width = "800px";
	info_box.style.padding = "12px";
	info_box.style.boxShadow = "2px 2px 0 rgba( 0, 0, 0, 0.6 )";
	info_box.style.color = "#ededed";
	info_box.style.margin = "2px auto";
	info_box.style.overflow = "auto";
	info_box.style.cssFloat = "left";
	info_box.style.styleFloat = "left";

	var options1 = document.createElement("div");
	options1.style["-moz-column-count"] = 2;
	options1.style["-webkit-column-count"] = 2;
	options1.style["column-count"] = 2;
	options1.style.width = "50%";
	options1.style.float = "left";

	options1.appendChild(makeCheckBox("enableAutoClicker", "Enable autoclicker", enableAutoClicker, toggleAutoClicker, false));
	options1.appendChild(makeCheckBox("enableAutoUpgradeHP", "Enable AutoUpgrade HP (up to 300k HP)", enableAutoUpgradeHP, toggleAutoUpgradeHP, false));
	options1.appendChild(makeCheckBox("enableAutoUpgradeClick", "Enable AutoUpgrade Clicks", enableAutoUpgradeClick, toggleAutoUpgradeClick, false));
	options1.appendChild(makeCheckBox("enableAutoUpgradeDPS", "Enable AutoUpgrade DPS", enableAutoUpgradeDPS, toggleAutoUpgradeDPS, false));
	options1.appendChild(makeCheckBox("removeInterface", "Remove interface", removeInterface, handleEvent, true));
	options1.appendChild(makeCheckBox("removeParticles", "Remove particle effects", removeParticles, handleEvent, true));
	options1.appendChild(makeCheckBox("removeFlinching", "Remove flinching effects", removeFlinching, handleEvent, true));
	options1.appendChild(makeCheckBox("removeCritText", "Remove crit text", removeCritText, toggleCritText, false));
	options1.appendChild(makeCheckBox("removeAllText", "Remove all text", removeAllText, toggleAllText, false));
	options1.appendChild(makeCheckBox("disableRenderer", "Limit frames per second to increase performance", disableRenderer, toggleRenderer, false));

	info_box.appendChild(options1);

	var options2 = document.createElement("div");
	options2.style["-moz-column-count"] = 2;
	options2.style["-webkit-column-count"] = 2;
	options2.style["column-count"] = 2;
	options2.style.width = "50%";
	options2.style.float = "left";

	if (typeof GM_info !==  "undefined") {
		options2.appendChild(makeCheckBox("enableAutoRefresh", "Enable auto-refresh (mitigate memory leak)", enableAutoRefresh, toggleAutoRefresh, false));
	}

	options2.appendChild(makeCheckBox("enableFingering", "Enable targeting pointer", enableFingering, handleEvent,true));
	options2.appendChild(makeCheckBox("nukeBeforeReset", "Spam abilities 1 hour before game end", nukeBeforeReset, handleEvent, true));
	options2.appendChild(makeNumber("setLogLevel", "Change the log level (you shouldn't need to touch this)", "25px", logLevel, 0, 5, updateLogLevel));

	info_box.appendChild(options2);

	//Elemental upgrades lock
	var ab_box = document.getElementById("abilities");
	var lock_elements_box = document.createElement("div");
	lock_elements_box.className = "lock_elements_box";
	lock_elements_box.style.width = "165px";
	lock_elements_box.style.top = "-76px";
	lock_elements_box.style.left = "303px";
	lock_elements_box.style.boxSizing = "border-box";
	lock_elements_box.style.lineHeight = "1rem";
	lock_elements_box.style.padding = "7px 10px";
	lock_elements_box.style.position = "absolute";
	lock_elements_box.style.color = "#ededed";
	lock_elements_box.title = "To maximise team damage players should max only one element. But distributions of elements through people should be equal. So we calculated your element using your unique ID. Upgrade your element to make maximum performance or disable this checkbox.";
	var lock_elements_checkbox = makeCheckBox("enableElementLock", "Lock element upgrades for more team dps", enableElementLock, toggleElementLock, false);
	lock_elements_box.appendChild(lock_elements_checkbox);
	ab_box.appendChild(lock_elements_box);

	enhanceTooltips();
}

function disableParticles() {
	if (w.CSceneGame) {
		w.CSceneGame.prototype.DoScreenShake = function() {};

		if(removeParticles) {
			w.CSceneGame.prototype.SpawnEmitter = function(emitter) {
				emitter.emit = false;
				return emitter;
			};
		}
	}
}

function isNearEndGame() {
	var cTime = new Date();
	var cHours = cTime.getUTCHours();
	var cMins = cTime.getUTCMinutes();
	var timeLeft = 60 - cMins;
	if (cHours == 15 && timeLeft <= 60) {
		return true;
	}
	else {
		return false;
	}
}

function MainLoop() {
	var status = s().m_rgGameData.status;
	if(status != GAME_STATUS.RUNNING)
	{
		return;
	}
	
	var level = s().m_rgGameData.level + 1;


	if (!isAlreadyRunning) {
		isAlreadyRunning = true;

		goToLaneWithBestTarget(level);

		attemptRespawn();

		useAbilities(level);

		updatePlayersInGame();

		if( level !== lastLevel ) {
			lastLevel = level;
			updateLevelInfoTitle(level);
			refreshPlayerData();
		}

		useAutoUpgrade();

		s().m_nClicks += currentClickRate;
		s().m_nLastTick = false;
		w.g_msTickRate = 1000;

		var damagePerClick = s().CalculateDamage(
			s().m_rgPlayerTechTree.damage_per_click,
			s().m_rgGameData.lanes[s().m_rgPlayerData.current_lane].element
		);

		advLog("Ticked. Current clicks per second: " + currentClickRate + ". Current damage per second: " + (damagePerClick * currentClickRate), 4);

		if(disableRenderer) {
			s().Tick();

			requestAnimationFrame(function() {
				w.g_Minigame.Renderer.render(s().m_Container);
			});
		}

		isAlreadyRunning = false;

		if( currentClickRate > 0 ) {
			var enemy = s().GetEnemy(
				s().m_rgPlayerData.current_lane,
				s().m_rgPlayerData.target);

			if (enemy) {
				displayText(
					enemy.m_Sprite.position.x - (enemy.m_nLane * 440),
					enemy.m_Sprite.position.y - 52,
					"-" + w.FormatNumberForDisplay((damagePerClick * currentClickRate), 5),
					"#aaf"
				);

				if( s().m_rgStoredCrits.length > 0 ) {
					var rgDamage = s().m_rgStoredCrits.reduce(function(a,b) {
						return a + b;
					});
					s().m_rgStoredCrits.length = 0;

					s().DoCritEffect( rgDamage, enemy.m_Sprite.position.x - (enemy.m_nLane * 440), enemy.m_Sprite.position.y + 17, 'Crit!' );
				}

				var goldPerClickPercentage = s().m_rgGameData.lanes[s().m_rgPlayerData.current_lane].active_player_ability_gold_per_click;
				if (goldPerClickPercentage > 0 && enemy.m_data.hp > 0) {
					var goldPerSecond = enemy.m_data.gold * goldPerClickPercentage * currentClickRate;

					s().ClientOverride('player_data', 'gold', s().m_rgPlayerData.gold + goldPerSecond);
					s().ApplyClientOverrides('player_data', true);

					advLog(
						"Raining gold ability is active in current lane. Percentage per click: " + goldPerClickPercentage
						+ "%. Approximately gold per second: " + goldPerSecond,
						4
					);
					displayText(
						enemy.m_Sprite.position.x - (enemy.m_nLane * 440),
						enemy.m_Sprite.position.y - 17,
						"+" + w.FormatNumberForDisplay(goldPerSecond, 5),
						"#e1b21e"
					);
				}
			}
		}
		
		// Prune older entries (for real)
		var e = s().m_rgActionLog;
		if(e.length > 20)
		{
			s().m_rgActionLog = e.slice(-20);
		}
	}
}

var autoupgrade_update_hilight = true;

function useAutoUpgrade() {
	if(!enableAutoUpgradeDPS && !enableAutoUpgradeClick && !enableAutoUpgradeHP) { return; }

	var upg_order = [
		UPGRADES.ARMOR_PIERCING_ROUND,
		UPGRADES.LIGHT_ARMOR,
		UPGRADES.AUTO_FIRE_CANNON,
	];
	var upg_map = {};

	upg_order.forEach(function(i) { upg_map[i] = {}; });
	var pData = s().m_rgPlayerData;
	var cache = s().m_UI.m_rgElementCache;
	var upg_enabled = [
		enableAutoUpgradeClick,
		enableAutoUpgradeHP && pData.hp < 300000,
		enableAutoUpgradeDPS,
	];

	// loop over all upgrades and find the most cost effective ones
	s().m_rgTuningData.upgrades.forEach(function(upg, idx) {
		if(upg_map.hasOwnProperty(upg.type)) {

			var cost = s().GetUpgradeCost(idx) / parseFloat(upg.multiplier);

			if(!upg_map[upg.type].hasOwnProperty('idx') || upg_map[upg.type].cost_per_mult > cost) {
				if(upg.hasOwnProperty('required_upgrade') && s().GetUpgradeLevel(upg.required_upgrade) < upg.required_upgrade_level) { return; }

				upg_map[upg.type] = {
					'idx': idx,
					'cost_per_mult': cost,
				};
			}
		}
	});

	// do hilighting if needed
	if(autoupgrade_update_hilight) {
		autoupgrade_update_hilight = false;

		// clear all currently hilighted
		[].forEach.call(document.querySelectorAll('[id^="upgr_"] .info'),
				function(elm) { elm.style.color = ''; });

		// hilight targets
		[].forEach.call(document.querySelectorAll(Object.keys(upg_map).map(function(i) {
				return "#upgr_" + upg_map[i].idx + " .info";
			})
			.join(",")),
		function(elm) { elm.style.setProperty('color', '#E1B21E', 'important'); });
	}

	// do upgrading
	for(var i = 0; i < upg_order.length; i++ ) {
		if(!upg_enabled[i]) { continue; }

		// prioritize click upgrades over DPS ones, unless they are more cost effective
		if(upg_order[i] === UPGRADES.AUTO_FIRE_CANNON && enableAutoUpgradeClick) {
			if(upg_map[UPGRADES.AUTO_FIRE_CANNON].cost_per_mult >= upg_map[UPGRADES.ARMOR_PIERCING_ROUND].cost_per_mult / 10) { continue; }
		}

		var tree = upg_map[upg_order[i]];
		var key = 'upgr_' + tree.idx;

		if(s().GetUpgradeCost(tree.idx) < pData.gold && cache.hasOwnProperty(key)) {
			s().TryUpgrade(cache[key].find('.link')[0]);
			autoupgrade_update_hilight = true;
		}
	}

}

function toggleAutoUpgradeDPS(event) {
	var value = enableAutoUpgradeDPS;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	enableAutoUpgradeDPS = value;
}

function toggleAutoUpgradeClick(event) {
	var value = enableAutoUpgradeClick;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	enableAutoUpgradeClick = value;
}

function toggleAutoUpgradeHP(event) {
	var value = enableAutoUpgradeHP;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	enableAutoUpgradeHP = value;
}

function refreshPlayerData() {
	advLog("Refreshing player data", 2);

	w.g_Server.GetPlayerData(
		function(rgResult) {
			var instance = s();

			if( rgResult.response.player_data ) {
				instance.m_rgPlayerData = rgResult.response.player_data;
				instance.ApplyClientOverrides('player_data');
				instance.ApplyClientOverrides('ability');
			}

			if( rgResult.response.tech_tree ) {
				instance.m_rgPlayerTechTree = rgResult.response.tech_tree;
				if( rgResult.response.tech_tree.upgrades ) {
					instance.m_rgPlayerUpgrades = w.V_ToArray( rgResult.response.tech_tree.upgrades );
				} else {
					instance.m_rgPlayerUpgrades = [];
				}
			}

			instance.OnReceiveUpdate();
		},
		function() {},
		true
	);
}

function makeNumber(name, desc, width, value, min, max, listener) {
	var label= document.createElement("label");
	var description = document.createTextNode(desc);
	var number = document.createElement("input");

	number.type = "number";
	number.name = name;
	number.style.width = width;
	number.style.marginRight = "5px";
	number.value = value;
	number.min = min;
	number.max = max;
	number.onchange = listener;
	w[number.name] = number;

	label.appendChild(number);
	label.appendChild(description);
	label.appendChild(document.createElement("br"));
	return label;
}

function makeCheckBox(name, desc, state, listener, reqRefresh) {
	var asterisk = document.createElement('span');
	asterisk.appendChild(document.createTextNode("*"));
	asterisk.style.color = "#FF5252";
	asterisk.style.fontSize = "22px";
	asterisk.style.lineHeight = "14px";
	asterisk.style.verticalAlign = "bottom";

	var label= document.createElement("label");
	var description = document.createTextNode(desc);
	var checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.name = name;
	checkbox.checked = state;
	checkbox.onclick = listener;
	w[checkbox.name] = checkbox.checked;

	label.appendChild(checkbox);
	label.appendChild(description);
	if(reqRefresh) {
		label.appendChild(asterisk);
	}
	label.appendChild(document.createElement("br"));
	return label;
}

function handleEvent(event) {
	handleCheckBox(event);
}

function handleCheckBox(event) {
	var checkbox = event.target;
	setPreference(checkbox.name, checkbox.checked);

	w[checkbox.name] = checkbox.checked;
	return checkbox.checked;
}

function toggleAutoClicker(event) {
	var value = enableAutoClicker;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	if(value) {
		currentClickRate = clickRate;
	} else {
		currentClickRate = 0;
	}
}

function toggleAutoRefresh(event) {
	var value = enableAutoRefresh;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	if(value) {
		autoRefreshPage(autoRefreshMinutes);
	} else {
		clearTimeout(refreshTimer);
	}
}

function toggleRenderer(event) {
	var value = disableRenderer;

	if (event !== undefined) {
		value = disableRenderer = handleCheckBox(event);
	}

	var ticker = w.PIXI.ticker.shared;

	if (!value) {
		ticker.autoStart = true;
		ticker.start();

		w.g_Minigame.Render = trt_oldRender;
		w.g_Minigame.Render();
	} else {
		ticker.autoStart = false;
		ticker.stop();

		w.g_Minigame.Render = function() {};
	}
}

function autoRefreshPage(autoRefreshMinutes){
	var timerValue = (autoRefreshMinutes + autoRefreshMinutesRandomDelay * Math.random()) * 60 * 1000;
	refreshTimer = setTimeout(function() {
		autoRefreshHandler();
	}, timerValue);
}

function autoRefreshHandler() {
	var enemyData = s().GetEnemy(s().m_rgPlayerData.current_lane, s().m_rgPlayerData.target).m_data;
	if(typeof enemyData !== "undefined"){
		var enemyType = enemyData.type;
		if(enemyType != ENEMY_TYPE.BOSS) {
			advLog('Refreshing, not boss', 5);
			w.location.reload(true);
		}else {
			advLog('Not refreshing, A boss!', 5);
			setTimeout(autoRefreshHandler, 3000);
		}
	}else{
		//Wait until it is defined
		setTimeout(autoRefreshHandler, 1000);
	}
}

function toggleElementLock(event) {
	var value = enableElementLock;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	if(value) {
		lockElements();
	} else {
		unlockElements();
	}
}

function toggleCritText(event) {
	var value = removeCritText;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	if (value) {
		// Replaces the entire crit display function.
		s().DoCritEffect = function() {};
	} else {
		s().DoCritEffect = trt_oldCrit;
	}
}

function toggleAllText(event) {
	var value = removeAllText;

	if(event !== undefined) {
		value = handleCheckBox(event);
	}

	if (value) {
		// Replaces the entire text function.
		s().m_rgClickNumbers.push = function(elem){
			elem.container.removeChild(elem);
		};
	} else {
		s().m_rgClickNumbers.push = trt_oldPush;
	}
}

function updateLogLevel(event) {
	if(event !== undefined) {
		logLevel = event.target.value;
	}
}

function setPreference(key, value) {
	try {
		if(localStorage !== 'undefined') {
			localStorage.setItem('steamdb-minigame/' + key, value);
		}
	} catch (e) {
		console.log(e); // silently ignore error
	}
}

function getPreference(key, defaultValue) {
	try {
		if(localStorage !== 'undefined') {
			var result = localStorage.getItem('steamdb-minigame/' + key);
			return (result !== null ? result : defaultValue);
		}
	} catch (e) {
		console.log(e); // silently ignore error
		return defaultValue;
	}
}

function getPreferenceBoolean(key, defaultValue) {
	return (getPreference(key, defaultValue.toString()) == "true");
}

function unlockElements() {
	var fire = document.querySelector("a.link.element_upgrade_btn[data-type=\"3\"]");
	var water = document.querySelector("a.link.element_upgrade_btn[data-type=\"4\"]");
	var air = document.querySelector("a.link.element_upgrade_btn[data-type=\"5\"]");
	var earth = document.querySelector("a.link.element_upgrade_btn[data-type=\"6\"]");

	var elems = [fire, water, air, earth];

	for (var i=0; i < elems.length; i++) {
		elems[i].style.visibility = "visible";
	}
}

function lockElements() {
	var elementMultipliers = [
	s().m_rgPlayerTechTree.damage_multiplier_fire,
	s().m_rgPlayerTechTree.damage_multiplier_water,
	s().m_rgPlayerTechTree.damage_multiplier_air,
	s().m_rgPlayerTechTree.damage_multiplier_earth
	];

	var hashCode=function(str) {
		var t=0, i, char;
		if (0 === str.length) {
			return t;
		}

		for (i=0; i<str.length; i++) {
			char=str.charCodeAt(i);
			t=(t<<5)-t+char;
			t&=t;
		}

		return t;
	};

	var elem = Math.abs(hashCode(w.g_steamID) % 4);

	// If more than two elements are leveled to 3 or higher, do not enable lock
	var leveled = 0;
	var lastLeveled = -1;

	for (var i=0; i < elementMultipliers.length; i++){
		advLog("Element " + i + " is at level " + (elementMultipliers[i]-1)/1.5, 3);
		if ((elementMultipliers[i]-1)/1.5 >= 3) {
			leveled++;
			// Only used if there is only one so overwriting it doesn't matter
			lastLeveled = i;
		}
	}

	if (leveled >= 2) {
		advLog("More than 2 elementals leveled to 3 or above, not locking.", 1);
		return;
	} else if (leveled == 1) {
		advLog("Found existing lock on " + lastLeveled + ", locking to it.", 1);
		lockToElement(lastLeveled);
	} else {
		advLog("Locking to element " + elem + " as chosen by SteamID", 1);
		lockToElement(elem);
	}
}

function lockToElement(element) {
	var fire = document.querySelector("a.link.element_upgrade_btn[data-type=\"3\"]");
	var water = document.querySelector("a.link.element_upgrade_btn[data-type=\"4\"]");
	var air = document.querySelector("a.link.element_upgrade_btn[data-type=\"5\"]");
	var earth = document.querySelector("a.link.element_upgrade_btn[data-type=\"6\"]");

	var elems = [fire, water, air, earth];

	for (var i=0; i < elems.length; i++) {
		if (i === element) {
			continue;
		}
		elems[i].style.visibility = "hidden";
	}
	lockedElement = element; // Save locked element.
}

function displayText(x, y, strText, color) {
	var text = new w.PIXI.Text(strText, {font: "35px 'Press Start 2P'", fill: color, stroke: '#000', strokeThickness: 2 });

	text.x = x;
	text.y = y;

	s().m_containerUI.addChild( text );
	text.container = s().m_containerUI;

	var e = new w.CEasingSinOut( text.y, -200, 1000 );
	e.parent = text;
	text.m_easeY = e;

	e = new w.CEasingSinOut( 2, -2, 1000 );
	e.parent = text;
	text.m_easeAlpha = e;

	s().m_rgClickNumbers.push(text);
}

function updatePlayersInGame() {
	var laneData = s().m_rgLaneData;
	var totalPlayers =
		laneData[ 0 ].players +
		laneData[ 1 ].players +
		laneData[ 2 ].players;
	ELEMENTS.PlayersInGame.textContent = totalPlayers + "/1500";
}

function goToLaneWithBestTarget(level) {
	// We can overlook spawners if all spawners are 40% hp or higher and a creep is under 10% hp
	var spawnerOKThreshold = 0.4;
	var creepSnagThreshold = 0.1;

	var targetFound = false;
	var lowHP = 0;
	var lowLane = 0;
	var lowTarget = 0;
	var lowPercentageHP = 0;
	var preferredLane = -1;
	var preferredTarget = -1;

	// determine which lane and enemy is the optimal target
	var enemyTypePriority = [
		ENEMY_TYPE.TREASURE,
		ENEMY_TYPE.BOSS,
		ENEMY_TYPE.MINIBOSS,
		ENEMY_TYPE.SPAWNER,
		ENEMY_TYPE.CREEP
	];

	var i;
	var skippingSpawner = false;
	var skippedSpawnerLane = 0;
	var skippedSpawnerTarget = 0;
	var targetIsTreasure = false;
	var targetIsBoss = false;

	for (var k = 0; !targetFound && k < enemyTypePriority.length; k++) {
		targetIsTreasure = (enemyTypePriority[k] == ENEMY_TYPE.TREASURE);
		targetIsBoss = (enemyTypePriority[k] == ENEMY_TYPE.BOSS);

		var enemies = [];

		// gather all the enemies of the specified type.
		for (i = 0; i < 3; i++) {
			for (var j = 0; j < 4; j++) {
				var enemy = s().GetEnemy(i, j);
				if (enemy && enemy.m_data.type == enemyTypePriority[k]) {
					enemies[enemies.length] = enemy;
				}
			}
		}

		//Prefer lane with raining gold, unless current enemy target is a treasure or boss.
		if(!targetIsTreasure && !targetIsBoss) {
			var potential = 0;
			// Loop through lanes by elemental preference
			var sortedLanes = sortLanesByElementals();
			for(var notI = 0; notI < sortedLanes.length; notI++) {
				// Maximize compability with upstream
				i = sortedLanes[notI];
				// ignore if lane is empty
				if(s().m_rgGameData.lanes[i].dps === 0) {
					continue;
				}
				var stacks = 0;
				if(typeof s().m_rgLaneData[i].abilities[ABILITIES.RAINING_GOLD] != 'undefined') {
					stacks = s().m_rgLaneData[i].abilities[ABILITIES.RAINING_GOLD];
					advLog('[Gold rain] stacks: ' + stacks, 5);

					for(var m = 0; m < s().m_rgEnemies.length; m++){
						if(s().m_rgEnemies[m].m_nLane != i){
							continue;
						}
						advLog("[Gold rain] An enemy exists in raining gold lane: " + (i + 1), 5);
						var enemyGold = s().m_rgEnemies[m].m_data.gold;
						if(stacks * enemyGold > potential) {
							potential = stacks * enemyGold;
							preferredTarget = s().m_rgEnemies[m].m_nID;
							preferredLane = i;
						}
					}
					advLog("[Gold rain] preferredLane: " + preferredLane, 5);
					advLog("[Gold rain] preferredTarget: " +  preferredTarget, 5);
				}
			}
		}

		// target the enemy of the specified type with the lowest hp
		var mostHPDone = 0;
		for (i = 0; i < enemies.length; i++) {
			if (enemies[i] && !enemies[i].m_bIsDestroyed) {
				// Only select enemy and lane if the preferedLane matches the potential enemy lane
				if(lowHP < 1 || enemies[i].m_flDisplayedHP < lowHP) {
					var element = s().m_rgGameData.lanes[enemies[i].m_nLane].element;

					var dmg = s().CalculateDamage(
						s().m_rgPlayerTechTree.dps,
						element
						);

					if(mostHPDone <= dmg) {
						mostHPDone = dmg;
					} else {
						continue;
					}

					targetFound = true;
					lowHP = enemies[i].m_flDisplayedHP;
					lowLane = enemies[i].m_nLane;
					lowTarget = enemies[i].m_nID;
				}
				var percentageHP = enemies[i].m_flDisplayedHP / enemies[i].m_data.max_hp;
				if (lowPercentageHP === 0 || percentageHP < lowPercentageHP) {
					lowPercentageHP = percentageHP;
				}
			}
		}

		if(preferredLane != -1 && preferredTarget != -1){
			lowLane = preferredLane;
			lowTarget = preferredTarget;
			advLog('Switching to a lane with best raining gold benefit', 2);
		}

		// If we just finished looking at spawners,
		// AND none of them were below our threshold,
		// remember them and look for low creeps (so don't quit now)
		// Don't skip spawner if lane has raining gold
		if ((enemyTypePriority[k] == ENEMY_TYPE.SPAWNER && lowPercentageHP > spawnerOKThreshold) && preferredLane == -1) {
			skippedSpawnerLane = lowLane;
			skippedSpawnerTarget = lowTarget;
			skippingSpawner = true;
			targetFound = false;
		}

		// If we skipped a spawner and just finished looking at creeps,
		// AND the lowest was above our snag threshold,
		// just go back to the spawner!
		if (skippingSpawner && enemyTypePriority[k] == ENEMY_TYPE.CREEP && lowPercentageHP > creepSnagThreshold ) {
			lowLane = skippedSpawnerLane;
			lowTarget = skippedSpawnerTarget;
		}
	}

	// go to the chosen lane
	if (targetFound) {
		if (s().m_nExpectedLane != lowLane) {
			advLog('Switching to lane' + lowLane, 3);
			s().TryChangeLane(lowLane);
		}

		// target the chosen enemy
		if (s().m_nTarget != lowTarget) {
			advLog('Switching targets', 3);
			s().TryChangeTarget(lowTarget);
		}

		// Prevent attack abilities and items if up against a boss or treasure minion
		if (targetIsTreasure || (targetIsBoss && (level < CONTROL.speedThreshold || level % CONTROL.rainingRounds === 0))) {
			BOSS_DISABLED_ABILITIES.forEach(disableAbility);
		} else {
			BOSS_DISABLED_ABILITIES.forEach(enableAbility);
		}

		// Always disable wormhole on lower levels
		if(level < CONTROL.speedThreshold) {
			disableAbility(ABILITIES.WORMHOLE);
		} else {
			enableAbility(ABILITIES.WORMHOLE);
		}
	}
}


function hasMaxCriticalOnLane() {
	var goodLuckCharms = getActiveAbilityLaneCount(ABILITIES.GOOD_LUCK_CHARMS);
	var crit = getActiveAbilityLaneCount(ABILITIES.CRIT);
	var totalCritical = goodLuckCharms + crit;

	if (totalCritical >= 99) { // Lane has 1% by default
		return true;
	}
	else {
		return false;
	}
}

function useAbilities(level)
{

	var currentLane = s().m_nExpectedLane;

	var i = 0;
	var enemyCount = 0;
	var enemySpawnerExists = false;
	var enemySpawnerHealthPercent = false;
	var enemy = false;
	var enemyBossHealthPercent = 0;

	// Cooldown
	if(getActiveAbilityLaneCount(ABILITIES.DECREASE_COOLDOWNS) > 0) {
		disableAbility(ABILITIES.DECREASE_COOLDOWNS);
	}
	else
	{
		if(!s().bIsAbilityActive(ABILITIES.DECREASE_COOLDOWNS)) {
			enableAbility(ABILITIES.DECREASE_COOLDOWNS);
		}

		tryUsingAbility(ABILITIES.DECREASE_COOLDOWNS);
	}

	// Cripple Monster
	if(canUseAbility(ABILITIES.CRIPPLE_MONSTER)) {
		if (level > CONTROL.speedThreshold && level % CONTROL.rainingRounds !== 0 && level % 10 === 0) {
			enemy = s().GetEnemy(s().m_rgPlayerData.current_lane, s().m_rgPlayerData.target);
			if (enemy && enemy.m_data.type == ENEMY_TYPE.BOSS) {
				enemyBossHealthPercent = enemy.m_flDisplayedHP / enemy.m_data.max_hp;
				if (enemyBossHealthPercent>0.5){
					advLog("Cripple Monster available and used on boss", 2);
					triggerAbility(ABILITIES.CRIPPLE_MONSTER);
				}
			}
		}
	}

	// Medic & Pumped Up
	if (tryUsingAbility(ABILITIES.PUMPED_UP)){
		// Pumped Up is purchased, cooled down, and needed. Trigger it.
		advLog('Pumped up is always good.', 2);
	}
	else
	{
		// check if Medics is purchased and cooled down
		if (tryUsingAbility(ABILITIES.MEDICS)) {
			advLog('BadMedic is purchased, cooled down. Trigger it.', 2);
		}

		if(level > 5000 && tryUsingAbility(ABILITIES.REFLECT_DAMAGE)) {
			advLog('We have reflect damage, cooled down. Trigger it.', 2);
		}
		else if(level > 2500 && tryUsingAbility(ABILITIES.STEAL_HEALTH)) {
			advLog('We have steal health, cooled down. Trigger it.', 2);
		}
		else if (tryUsingAbility(ABILITIES.GOD_MODE)) {
			advLog('We have god mode, cooled down. Trigger it.', 2);
		}

	}

	// Good Luck Charms / Crit
	if(!hasMaxCriticalOnLane())
	{
		if (tryUsingAbility(ABILITIES.CRIT)){
			// Crits is purchased, cooled down, and needed. Trigger it.
			advLog('Crit chance is always good.', 3);
		}
	}
	if(!hasMaxCriticalOnLane())
	{
		// check if Good Luck Charms is purchased and cooled down
		if (tryUsingAbility(ABILITIES.GOOD_LUCK_CHARMS)) {
			advLog('Good Luck Charms is purchased, cooled down, and needed. Trigger it.', 2);
		}
	}

	// Cluster Bomb
	if (canUseAbility(ABILITIES.CLUSTER_BOMB)) {
	//Check lane has monsters to explode
		enemyCount = 0;
		enemySpawnerExists = false;
		//Count each slot in lane
		for (i = 0; i < 4; i++) {
			enemy = s().GetEnemy(currentLane, i);
			if (enemy) {
				enemyCount++;
				if (enemy.m_data.type === 0) {
					enemySpawnerExists = true;
				}
			}
		}
		//Bombs away if spawner and 2+ other monsters
		if (enemySpawnerExists && enemyCount >= 3) {
			triggerAbility(ABILITIES.CLUSTER_BOMB);
		}
	}

	// Napalm
	if (canUseAbility(ABILITIES.NAPALM)) {
		//Check lane has monsters to burn
		enemyCount = 0;
		enemySpawnerExists = false;
		//Count each slot in lane
		for (i = 0; i < 4; i++) {
			enemy = s().GetEnemy(currentLane, i);
			if (enemy) {
				enemyCount++;
				if (enemy.m_data.type === 0) {
					enemySpawnerExists = true;
				}
			}
		}
		//Burn them all if spawner and 2+ other monsters
		if (enemySpawnerExists && enemyCount >= 3) {
			triggerAbility(ABILITIES.NAPALM);
		}
	}

	// Morale Booster
	if (canUseAbility(ABILITIES.MORALE_BOOSTER)) {
		var numberOfWorthwhileEnemies = 0;
		for(i = 0; i < s().m_rgGameData.lanes[s().m_nExpectedLane].enemies.length; i++) {
			//Worthwhile enemy is when an enamy has a current hp value of at least 1,000,000
			if(s().m_rgGameData.lanes[s().m_nExpectedLane].enemies[i].hp > 1000000) {
				numberOfWorthwhileEnemies++;
			}
		}

		if(numberOfWorthwhileEnemies >= 2) {
			// Moral Booster is purchased, cooled down, and needed. Trigger it.
			advLog('Moral Booster is purchased, cooled down, and needed. Trigger it.', 2);
			triggerAbility(ABILITIES.MORALE_BOOSTER);
		}
	}

	// Tactical Nuke
	if(canUseAbility(ABILITIES.TACTICAL_NUKE)) {
		//Check that the lane has a spawner and record it's health percentage
			enemySpawnerExists = false;
			enemySpawnerHealthPercent = 0.0;
		//Count each slot in lane
		for (i = 0; i < 4; i++) {
			enemy = s().GetEnemy(currentLane, i);
			if (enemy) {
				if (enemy.m_data.type === 0) {
					enemySpawnerExists = true;
					enemySpawnerHealthPercent = enemy.m_flDisplayedHP / enemy.m_data.max_hp;
				}
			}
		}

		// If there is a spawner and it's health is between 60% and 30%, nuke it!
		if (enemySpawnerExists && enemySpawnerHealthPercent < 0.6 && enemySpawnerHealthPercent > 0.3) {
			advLog("Tactical Nuke is purchased, cooled down, and needed. Nuke 'em.", 2);
			triggerAbility(ABILITIES.TACTICAL_NUKE);
		}
	}

	// Cripple Spawner
	if(canUseAbility(ABILITIES.CRIPPLE_SPAWNER)) {
		//Check that the lane has a spawner and record it's health percentage
		enemySpawnerExists = false;
		enemySpawnerHealthPercent = 0.0;
		//Count each slot in lane
		for (i = 0; i < 4; i++) {
			enemy = s().GetEnemy(currentLane, i);
			if (enemy) {
				if (enemy.m_data.type === 0) {
					enemySpawnerExists = true;
					enemySpawnerHealthPercent = enemy.m_flDisplayedHP / enemy.m_data.max_hp;
				}
			}
		}

		// If there is a spawner and it's health is above 95%, cripple it!
		if (enemySpawnerExists && enemySpawnerHealthPercent > 0.95) {
			advLog("Cripple Spawner available, and needed. Cripple 'em.", 2);
			triggerAbility(ABILITIES.CRIPPLE_SPAWNER);
		}
	}

	// Gold Rain
	if (canUseAbility(ABILITIES.RAINING_GOLD)) {
		// only use if the speed threshold has not been reached,
		// or it's a designated gold round after the threshold
		if (level < CONTROL.speedThreshold || level % CONTROL.rainingRounds === 0) {
			enemy = s().GetEnemy(s().m_rgPlayerData.current_lane, s().m_rgPlayerData.target);
			// check if current target is a boss, otherwise its not worth using the gold rain
			if (enemy && enemy.m_data.type == ENEMY_TYPE.BOSS) {
				enemyBossHealthPercent = enemy.m_flDisplayedHP / enemy.m_data.max_hp;
	
				if (enemyBossHealthPercent >= 0.6) { // We want sufficient time for the gold rain to be applicable
					// Gold Rain is purchased, cooled down, and needed. Trigger it.
					advLog('Gold rain is purchased and cooled down, Triggering it on boss', 2);
					triggerAbility(ABILITIES.RAINING_GOLD);
				}
			}
		}
	}

	// Metal Detector
	if(canUseAbility(ABILITIES.METAL_DETECTOR)) {

		enemy = s().GetEnemy(s().m_rgPlayerData.current_lane, s().m_rgPlayerData.target);
		// check if current target is a boss, otherwise we won't use metal detector
		if (enemy && enemy.m_data.type == ENEMY_TYPE.BOSS) {
			enemyBossHealthPercent = enemy.m_flDisplayedHP / enemy.m_data.max_hp;

			// we want to use metal detector at 25% hp, or even less
			if (enemyBossHealthPercent <= 0.25) { // We want sufficient time for the metal detector to be applicable
				// Metal Detector is purchased, cooled down, and needed. Trigger it.
				advLog('Metal Detector is purchased and cooled down, Triggering it on boss', 2);
				triggerAbility(ABILITIES.METAL_DETECTOR);
			}
		}
	}

	// Treasure
	if (canUseAbility(ABILITIES.TREASURE)) {

		// check if current level is higher than 50
		if (level > 50) {
			enemy = s().GetTargetedEnemy();
			// check if current target is a boss, otherwise we won't use metal detector
			if (enemy && enemy.type == ENEMY_TYPE.BOSS) {
				enemyBossHealthPercent = enemy.hp / enemy.max_hp;

				// we want to use Treasure at 25% hp, or even less
				if (enemyBossHealthPercent <= 0.25) { // We want sufficient time for the metal detector to be applicable
					// Treasure is purchased, cooled down, and needed. Trigger it.
					advLog('Treasure is purchased and cooled down, triggering it.', 2);
					triggerAbility(ABILITIES.TREASURE);
				}
			}
		}
		else {
			// Treasure is purchased, cooled down, and needed. Trigger it.
			advLog('Treasure is purchased and cooled down, triggering it.', 2);
			triggerAbility(ABILITIES.TREASURE);
		}
	}

	// Max Elemental
	if (tryUsingAbility(ABILITIES.MAX_ELEMENTAL_DAMAGE, true)) {
		// Max Elemental Damage is purchased, cooled down, and needed. Trigger it.
		advLog('Max Elemental Damage is purchased and cooled down, triggering it.', 2);
	}

	// Wormhole
	if (isNearEndGame() && nukeBeforeReset) {

		// Check if Wormhole is purchased
		if (tryUsingAbility(ABILITIES.WORMHOLE, true)) {
			advLog('Less than 60 minutes for game to end. Triggering wormholes...', 2);
		}
		else if (tryUsingAbility(ABILITIES.THROW_MONEY_AT_SCREEN)) {
			advLog('Less than 60 minutes for game to end. Throwing money at screen for no particular reason...', 2);
		}
	}

	// Resurrect
	if(level % 10 === 9 && tryUsingAbility(ABILITIES.RESURRECTION)) {
		// Resurrect is purchased and we are using it.
		advLog('Triggered Resurrect.');
	}
}

function attemptRespawn() {
	if ((s().m_bIsDead) && ((s().m_rgPlayerData.time_died) + 5) < (s().m_nTime)) {
		w.RespawnPlayer();
	}
}

function bHaveItem(itemId) {
	var items = s().m_rgPlayerTechTree.ability_items;

	for(var i = 0; i < items.length; ++i) {
		if(items[i].ability == itemId) {
			return true;
		}
	}

	return false;
}

function canUseAbility(abilityId) {
	if(!s().bHaveAbility(abilityId) && !bHaveItem(abilityId)) {
		return false;
	}

	return s().GetCooldownForAbility(abilityId) <= 0 && isAbilityEnabled(abilityId);
}

function tryUsingAbility(itemId, checkInLane) {
	if (!canUseAbility(itemId)) {
		return false;
	}

	if (checkInLane && getActiveAbilityLaneCount(itemId) > 0) {
		return false;
	}

	triggerAbility(itemId);

	return true;
}

function triggerAbility(abilityId) {
	s().m_rgAbilityQueue.push({'ability': abilityId});

	var nCooldownDuration = s().m_rgTuningData.abilities[abilityId].cooldown;
	s().ClientOverride('ability', abilityId, Math.floor(Date.now() / 1000) + nCooldownDuration);
	s().ApplyClientOverrides('ability', true);
}

function toggleAbilityVisibility(abilityId, show) {
	var vis = show === true ? "visible" : "hidden";

	var elem = document.getElementById('ability_' + abilityId);

	// temporary
	if(!elem) {
		elem = document.getElementById('abilityitem_' + abilityId);
	}

	if (elem && elem.childElements() && elem.childElements().length >= 1) {
		elem.childElements()[0].style.visibility = vis;
	}
}

function disableAbility(abilityId) {
	toggleAbilityVisibility(abilityId, false);
}

function enableAbility(abilityId) {
	toggleAbilityVisibility(abilityId, true);
}

function isAbilityEnabled(abilityId) {
	var elem = document.getElementById('ability_' + abilityId);

	// temporary
	if(!elem) {
		elem = document.getElementById('abilityitem_' + abilityId);
	}

	if (elem && elem.childElements() && elem.childElements().length >= 1) {
		return elem.childElements()[0].style.visibility !== "hidden";
	}
	return false;
}

function getActiveAbilityLaneCount(ability) {
	var now = getCurrentTime();
	var abilities = s().m_rgGameData.lanes[s().m_rgPlayerData.current_lane].active_player_abilities;
	var count = 0;
	for(var i = 0; i < abilities.length; i++) {
		if(abilities[i].ability == ability && abilities[i].timestamp_done > now) {
			count++;
		}
	}
	return count;
}

function sortLanesByElementals() {
	var elementPriorities = [
	s().m_rgPlayerTechTree.damage_multiplier_fire,
	s().m_rgPlayerTechTree.damage_multiplier_water,
	s().m_rgPlayerTechTree.damage_multiplier_air,
	s().m_rgPlayerTechTree.damage_multiplier_earth
	];

	var lanes = s().m_rgGameData.lanes;
	var lanePointers = [];

	for (var i = 0; i < lanes.length; i++) {
		lanePointers[i] = i;
	}

	lanePointers.sort(function(a, b) {
		return elementPriorities[lanes[b].element - 1] - elementPriorities[lanes[a].element - 1];
	});

	advLog("Lane IDs  : " + lanePointers[0] + " " + lanePointers[1] + " " + lanePointers[2], 4);
	advLog("Elements  : " + lanes[lanePointers[0]].element + " " + lanes[lanePointers[1]].element + " " + lanes[lanePointers[2]].element, 4);

	return lanePointers;
}

function getCurrentTime() {
	return s().m_rgGameData.timestamp;
}

function advLog(msg, lvl) {
	if (lvl <= logLevel) {
		console.log(msg);
	}
}

if(w.SteamDB_Minigame_Timer) {
	w.clearInterval(w.SteamDB_Minigame_Timer);
}

w.SteamDB_Minigame_Timer = w.setInterval(function(){
	if (w.g_Minigame
		&& s().m_bRunning
		&& s().m_rgPlayerTechTree
		&& s().m_rgGameData) {
		w.clearInterval(w.SteamDB_Minigame_Timer);
	firstRun();
	w.SteamDB_Minigame_Timer = w.setInterval(MainLoop, 1000);
}
}, 1000);

// reload page if game isn't fully loaded, regardless of autoRefresh setting
w.setTimeout(function() {
	// m_rgGameData is 'undefined' if stuck at 97/97 or below
	if (!w.g_Minigame
		||  !w.g_Minigame.m_CurrentScene
		||  !w.g_Minigame.m_CurrentScene.m_rgGameData) {
		w.location.reload(true);
}
}, autoRefreshSecondsCheckLoadedDelay * 1000);

appendBreadcrumbsTitleInfo();

function startFingering() {
	w.CSceneGame.prototype.ClearNewPlayer = function(){};

	if(!s().m_spriteFinger) {
		w.WebStorage.SetLocal('mg_how2click', 0);
		s().CheckNewPlayer();
		w.WebStorage.SetLocal('mg_how2click', 1);
	}

	document.getElementById('newplayer').style.display = 'none';
}

function enhanceTooltips() {
	var trt_oldTooltip = w.fnTooltipUpgradeDesc;

	w.fnTooltipUpgradeDesc = function(context){
		var $context = w.$J(context);
		var desc = $context.data('desc');
		var strOut = desc;
		var multiplier = parseFloat( $context.data('multiplier') );
		switch( $context.data('upgrade_type') ) {
			case 2: // Type for click damage. All tiers.
			strOut = trt_oldTooltip(context);
			var currentCritMultiplier = s().m_rgPlayerTechTree.damage_multiplier_crit;
			var currentCrit = s().m_rgPlayerTechTree.damage_per_click * currentCritMultiplier;
			var newCrit = s().m_rgTuningData.player.damage_per_click * (s().m_rgPlayerTechTree.damage_per_click_multiplier + multiplier) * currentCritMultiplier;
			strOut += '<br><br>Crit Click: ' + w.FormatNumberForDisplay( currentCrit ) + ' => ' + w.FormatNumberForDisplay( newCrit );
			break;
			case 7: // Lucky Shot's type.
			var currentMultiplier = s().m_rgPlayerTechTree.damage_multiplier_crit;
			var newMultiplier = currentMultiplier + multiplier;
			var dps = s().m_rgPlayerTechTree.dps;
			var clickDamage = s().m_rgPlayerTechTree.damage_per_click;

			strOut += '<br><br>You can have multiple crits in a second. The server combines them into one.';

			strOut += '<br><br>Crit Percentage: ' + (s().m_rgPlayerTechTree.crit_percentage * 100).toFixed(1) + '%';

			strOut += '<br><br>Critical Damage Multiplier:';
			strOut += '<br>Current: ' + ( currentMultiplier ) + 'x';
			strOut += '<br>Next Level: ' + ( newMultiplier ) + 'x';

			strOut += '<br><br>Damage with one crit:';
			strOut += '<br>DPS: ' + w.FormatNumberForDisplay( currentMultiplier * dps ) + ' => ' + w.FormatNumberForDisplay( newMultiplier * dps );
			strOut += '<br>Click: ' + w.FormatNumberForDisplay( currentMultiplier * clickDamage ) + ' => ' + w.FormatNumberForDisplay( newMultiplier * clickDamage );
			strOut += '<br><br>Base Increased By: ' + w.FormatNumberForDisplay(multiplier) + 'x';
			break;
			case 9: // Boss Loot Drop's type
			var bossLootChance = s().m_rgPlayerTechTree.boss_loot_drop_percentage * 100;

			strOut += '<br><br>Boss Loot Drop Rate:';
			strOut += '<br>Current: ' + bossLootChance.toFixed(0) + '%';
			strOut += '<br>Next Level: ' + (bossLootChance + multiplier * 100).toFixed(0) + '%';
			strOut += '<br><br>Base Increased By: ' + w.FormatNumberForDisplay(multiplier * 100) + '%';
			break;
			default:
			return trt_oldTooltip(context);
		}

		return strOut;
	};

	var trt_oldElemTooltip = w.fnTooltipUpgradeElementDesc;
	w.fnTooltipUpgradeElementDesc = function (context) {
		var strOut = trt_oldElemTooltip(context);

		var $context = w.$J(context);
		//var upgrades = s().m_rgTuningData.upgrades.slice(0);
		// Element Upgrade index 3 to 6
		var idx = $context.data('type');
		// Is the current tooltip for the recommended element?
		var isRecommendedElement = (lockedElement == idx - 3);

		if (isRecommendedElement){
			strOut += "<br><br>This is your recommended element. Please upgrade this.";

			if (w.enableElementLock){
				strOut += "<br><br>Other elements are LOCKED to prevent accidentally upgrading.";
			}

		} else if (-1 != lockedElement){
			strOut += "<br><br>This is NOT your recommended element. DO NOT upgrade this.";
		}

		return strOut;
	};
}

function countdown(time) {
	var hours = 0;
	var minutes = 0;
	for (var i = 0; i < 24; i++) {
		if (time >= 3600) {
			time = time - 3600;
			hours = hours + 1;
		}
	}
	for (var j = 0; j < 60; j++) {
		if (time >= 60) {
			time = time - 60;
			minutes = minutes + 1;
		}
	}
	return {hours : hours, minutes : minutes};
}

function expectedLevel(level) {
	var time = Math.floor(s().m_nTime) % 86400;
	time = time - 16*3600;
	if (time < 0) {
		time = time + 86400;
	}

	var remaining_time = 86400 - time;
	var passed_time = getCurrentTime() - s().m_rgGameData.timestamp_game_start;
	var expected_level = Math.floor(((level/passed_time)*remaining_time)+level);
	var likely_level = Math.floor((expected_level - level)/Math.log(3))+ level;
	
	return {expected_level : expected_level, likely_level : likely_level, remaining_time : remaining_time};
}

function appendBreadcrumbsTitleInfo() {
	var breadcrumbs = document.querySelector('.breadcrumbs');

	if(!breadcrumbs) {
		return;
	}

	var element = document.createElement('span');
	element.textContent = ' > ';
	breadcrumbs.appendChild(element);

	element = document.createElement('span');
	element.style.color = '#D4E157';
	element.style.textShadow = '1px 1px 0px rgba( 0, 0, 0, 0.3 )';
	element.textContent = 'Room ' + w.g_GameID;
	breadcrumbs.appendChild(element);

	element = document.createElement('span');
	element.textContent = ' > ';
	breadcrumbs.appendChild(element);

	element = document.createElement('span');
	element.style.color = '#FFA07A';
	element.style.textShadow = '1px 1px 0px rgba( 0, 0, 0, 0.3 )';
	element.textContent = 'Level: 0, Expected Level: 0, Likely Level: 0';
	breadcrumbs.appendChild(element);
	ELEMENTS.ExpectedLevel = element;

	element = document.createElement('span');
	element.textContent = ' > ';
	breadcrumbs.appendChild(element);

	element = document.createElement('span');
	element.style.color = '#9AC0FF';
	element.style.textShadow = '1px 1px 0px rgba( 0, 0, 0, 0.3 )';
	element.textContent = 'Remaining Time: 0 hours, 0 minutes.';
	breadcrumbs.appendChild(element);
	ELEMENTS.RemainingTime = element;
}

function updateLevelInfoTitle(level)
{
	var exp_lvl = expectedLevel(level);
	var rem_time = countdown(exp_lvl.remaining_time);

	ELEMENTS.ExpectedLevel.textContent = 'Level: ' + level + ', Expected Level: ' + exp_lvl.expected_level + ', Likely Level: ' + exp_lvl.likely_level;
	ELEMENTS.RemainingTime.textContent = 'Remaining Time: ' + rem_time.hours + ' hours, ' + rem_time.minutes + ' minutes.';
}

}(window));
