var isAlreadyRunning = false;
function doTheThing() {
	if (isAlreadyRunning || g_Minigame === undefined) {
		return;
	}
	isAlreadyRunning = true;
	
	goToLaneWithLowest();
	
	// TODO check health, use Medics ability if available and health below 50%
	
	// TODO use abilities if available and a suitable target exists
	// - Tactical Nuke on a Spawner if below 50% and above 25% of its health
	// - Cluster Bomb and Napalm if the current lane has a spawner and 2+ creeps
	// - Good Luck if available
	// - Metal Detector if a spawner death is imminent (predicted in > 2 and < 7 seconds)
	// - Morale Booster if available and lane has > 2 live enemies
	// - Decrease Cooldowns if another player used a long-cooldown ability < 10 seconds ago
	
	// TODO purchase abilities and upgrades intelligently
	
	// TODO click the current target a few times (<= 10/sec, so as not to cheat)
	
	isAlreadyRunning = false;
}

function goToLaneWithLowest() {
	// TODO check if it's a boss level, handle boss levels differently
	
	// TODO prefer lane with a dying creep as long as all living spawners have >50% health
	
	// determine which living spawner has lowest hp
	var spawners = [];
	for (var i = 0; i < 3; i++) {
		spawners[i] = g_Minigame.CurrentScene().GetEnemy(i, 0);
	}
	var lowHP = 0;
	var lowLane = 0;
	for (var i = 0; i < spawners.length; i++) {
		if(spawners[i] && !spawners[i].m_bIsDestroyed) {
			if(lowHP < 1 || spawners[i].m_flDisplayedHP < lowHP) {
				lowHP = spawners[i].m_flDisplayedHP;
				lowLane = spawners[i].m_nLane;
			}
		}
	}
	
	// if no spawners remain, determine which lane has a creep with the lowest health
	if (lowHP < 1) {
		// determine which living creep has the lowest hp
		var creeps = [];
		for (var i = 0; i < 3; i++) {
			for (var j = 0; j < 3; j++) {
				creeps[(3 * i) + j] = g_Minigame.CurrentScene().GetEnemy(i + 1, j);
			}
		}
		
		for (var i = 0; i < creeps.length; i++) {
			if (creeps[i] && !creeps[i].m_bIsDestroyed) {
				if (lowHP < 1 || creeps[i].m_flDisplayedHP < lowHP) {
					lowHP = creeps[i];
					lowLane = creeps[i].m_nLane;
				}
			}
		}
	}
	
	// go to the chosen lane.
	// TODO only try to change if it's not the current lane
	if (g_Minigame.CurrentScene().m_nExpectedLane != lowLane) {
		g_Minigame.CurrentScene().TryChangeLane(lowLane);
	}
}

var thingTimer = window.setInterval(doTheThing, 1000);