To make it harder to fill the battery (decreasing sensitivity), you will need to update src/App.tsx.

Specifically, look for the useEffect block that calculates the battery drain and gain (around line 90). You can tweak the following numbers to make it harder:

// 1. INCREASE THE DRAIN (makes it empty faster)
// Change the 5 to a higher number, like 8 or 10.
let drain = 5 * delta; 

let gain = 0;

// 2. REQUIRE MORE ACTIVITY TO TRIGGER GAIN
// Change the 10s to 20 or 30 so minor movements don't count.
if (currentMotionLevel > 10 || currentAudioLevel > 10) {
    
    // 3. DECREASE THE MULTIPLIERS (makes it fill slower)
    // Change 0.04 to something smaller like 0.02 or 0.01
    let baseMotionGain = currentMotionLevel * 0.04;
    let baseAudioGain = currentAudioLevel * 0.04;
    
    // Decrease the synergy bonus multiplier (e.g., from 0.12 down to 0.05)
    let synergyBonus = Math.min(currentMotionLevel, currentAudioLevel) * 0.12;
    
    gain = (baseMotionGain + baseAudioGain + synergyBonus) * delta;
}
