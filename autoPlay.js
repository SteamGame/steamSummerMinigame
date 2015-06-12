var isAlreadyRunning = false;
function doTheThing() {
	if (isAlreadyRunning || g_Minigame === undefined) {
		return;
	}
	isAlreadyRunning = true;
	
	goToLaneWithLowest();
	
	isAlreadyRunning = false;
}

function goToLaneWithLowest() {
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
	g_Minigame.CurrentScene().TryChangeLane(lowLane);
}

var thingTimer = window.setInterval(doTheThing, 1000);