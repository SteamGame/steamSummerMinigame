var clickRate = 20; // change to number of desired clicks per second

var isAlreadyRunning = false;
var myMaxHealth = 0;

function doTheThing() {
	if (isAlreadyRunning || g_Minigame === undefined) {
		return;
	}
	isAlreadyRunning = true;
	
	goToLaneWithLowest();
	
	useMedicsIfRelevant();
	
	// TODO use abilities if available and a suitable target exists
	// - Tactical Nuke on a Spawner if below 50% and above 25% of its health
	// - Cluster Bomb and Napalm if the current lane has a spawner and 2+ creeps
	// - Good Luck if available
	// - Metal Detector if a spawner death is imminent (predicted in > 2 and < 7 seconds)
	// - Morale Booster if available and lane has > 2 live enemies
	// - Decrease Cooldowns if another player used a long-cooldown ability < 10 seconds ago
	
	// TODO purchase abilities and upgrades intelligently
	
	// TODO click the current target a few times (<= 10/sec, so as not to cheat)
	
	// TODO respawn if dead and respawn button is available
	
	isAlreadyRunning = false;
}

function goToLaneWithLowest() {
	// TODO check if it's a boss level, handle boss levels differently
	
	// TODO prefer lane with a dying creep as long as all living spawners have >50% health
	
	// determine which living spawner has lowest hp
	var spawners = [];
	for (var i = 0; i < 3; i++) {
		for (var j = 0; j < 4; j++) {
			var enemy = g_Minigame.CurrentScene().GetEnemy(i, j);
			if (enemy && enemy.GetName() == 'Spawner') {
				spawners[spawners.length] = g_Minigame.CurrentScene().GetEnemy(i, j);
			}
		}
	}
	var lowHP = 0;
	var lowLane = 0;
	var lowTarget = 0;
	for (var i = 0; i < spawners.length; i++) {
		if(spawners[i] && !spawners[i].m_bIsDestroyed) {
			if(lowHP < 1 || spawners[i].m_flDisplayedHP < lowHP) {
				lowHP = spawners[i].m_flDisplayedHP;
				lowLane = spawners[i].m_nLane;
				lowTarget = spawners[i].m_nID;
			}
		}
	}
	
	// if no spawners remain, determine which lane has a creep with the lowest health
	if (lowHP < 1) {
		// determine which living creep has the lowest hp
		var creeps = [];
		for (var i = 0; i < 3; i++) {
			for (var j = 0; j < 4; j++) {
				var enemy = g_Minigame.CurrentScene().GetEnemy(i, j);
				if (enemy && enemy.m_data.type == 1) {
					creeps[creeps.length] = g_Minigame.CurrentScene().GetEnemy(i, j);
				}
			}
		}
		
		for (var i = 0; i < creeps.length; i++) {
			if (creeps[i] && !creeps[i].m_bIsDestroyed) {
				if (lowHP < 1 || creeps[i].m_flDisplayedHP < lowHP) {
					lowHP = creeps[i];
					lowLane = creeps[i].m_nLane;
					lowTarget = creeps[i].m_nID;
				}
			}
		}
	}
	
	// go to the chosen lane
	if (g_Minigame.CurrentScene().m_nExpectedLane != lowLane) {
		//console.log('switching langes');
		g_Minigame.CurrentScene().TryChangeLane(lowLane);
	}
	
	// target the chosen enemy
	if (g_Minigame.CurrentScene().m_nTarget != lowTarget) {
		//console.log('switching targets');
		g_Minigame.CurrentScene().TryChangeTarget(lowTarget);
	}
}

function useMedicsIfRelevant() {
	// regularly check HP to try to determine max health (I haven't found the variable for it yet)
	if (g_Minigame.CurrentScene().m_rgPlayerData.hp > myMaxHealth) {
		myMaxHealth = g_Minigame.CurrentScene().m_rgPlayerData.hp
	}
	
	// check if health is below 50%
	var hpPercent = g_Minigame.CurrentScene().m_rgPlayerData.hp / myMaxHealth;
	if (hpPercent > 0.5) {
		return; // no need to heal - HP is above 50%
	}
	
	// check if Medics is purchased and cooled down
	if ((1 << 7) & g_Minigame.CurrentScene().m_rgPlayerTechTree.unlocked_abilities_bitfield) {
		// each bit in unlocked_abilities_bitfield corresponds to an ability. Medics is ability 7.
		// the above condition checks if the Medics bit is set or cleared. I.e. it checks if
		// the player has the Medics ability.
		
		var abilitiesInCooldown = g_Minigame.CurrentScene().m_rgPlayerData.active_abilities;
		for (var i = 1; i < abilitiesInCooldown.length; i++) {
			if (abilitiesInCooldown[i].ability == 7) {
				return; // Medics is in cooldown, can't use it.
			}
		}
		
		// Medics is purchased, cooled down, and needed. Trigger it.
		console.log('Medics is purchased, cooled down, and needed. Trigger it.');
		if (document.getElementById('ability_7')) {
			g_Minigame.CurrentScene().TryAbility(document.getElementById('ability_7').childElements()[0]);
		}
	}
}

var thingTimer = window.setInterval(doTheThing, 1000);

function clickTheThing() {
    g_Minigame.m_CurrentScene.DoClick(
        {
            data: {
                getLocalPosition: function() {
                    var enemy = g_Minigame.m_CurrentScene.GetEnemy(
                                      g_Minigame.m_CurrentScene.m_rgPlayerData.current_lane,
                                      g_Minigame.m_CurrentScene.m_rgPlayerData.target),
                        laneOffset = enemy.m_nLane * 440;

                    return {
                        x: enemy.m_Sprite.position.x - laneOffset,
                        y: enemy.m_Sprite.position.y - 52
                    }
                }
            }
        }
    );
}

var clickTimer = window.setInterval(clickTheThing, 1000/clickRate);
