const vb = 2.003; // prettier-ignore
const b_potionSizes = ["small", "medium", "large", "huge", "legendary"];
const b_buffRegistry = [
	// Gold basics.
	{id: 5, name: "Small Potion of Clairvoyance", type: "potion", category: "basic", size: b_potionSizes[0], buff: "Clairvoyance"},
	{id: 6, name: "Medium Potion of Clairvoyance", type: "potion", category: "basic", size: b_potionSizes[1], buff: "Clairvoyance"},
	{id: 7, name: "Large Potion of Clairvoyance", type: "potion", category: "basic", size: b_potionSizes[2], buff: "Clairvoyance"},
	{id: 8, name: "Huge Potion of Clairvoyance", type: "potion", category: "basic", size: b_potionSizes[3], buff: "Clairvoyance"},
	{id: 2165, name: "Legendary Potion of Clairvoyance", type: "potion", category: "basic", size: b_potionSizes[4], buff: "Clairvoyance", legendary: true, distillBanned: true},

	// Click damage basics.
	{id: 37, name: "Small Potion of Fire Breath", type: "potion", category: "basic", size: b_potionSizes[0], buff: "Fire Breath"},
	{id: 38, name: "Medium Potion of Fire Breath", type: "potion", category: "basic", size: b_potionSizes[1], buff: "Fire Breath"},
	{id: 39, name: "Large Potion of Fire Breath", type: "potion", category: "basic", size: b_potionSizes[2], buff: "Fire Breath"},
	{id: 40, name: "Huge Potion of Fire Breath", type: "potion", category: "basic", size: b_potionSizes[3], buff: "Fire Breath"},
	{id: 2167, name: "Legendary Fire Breath Potion", type: "potion", category: "basic", size: b_potionSizes[4], buff: "Fire Breath", legendary: true, distillBanned: true},

	// Damage basics.
	{id: 1, name: "Small Potion of Giant's Strength", type: "potion", category: "basic", size: b_potionSizes[0], buff: "Giant's Strength"},
	{id: 2, name: "Medium Potion of Giant's Strength", type: "potion", category: "basic", size: b_potionSizes[1], buff: "Giant's Strength"},
	{id: 3, name: "Large Potion of Giant's Strength", type: "potion", category: "basic", size: b_potionSizes[2], buff: "Giant's Strength"},
	{id: 4, name: "Huge Potion of Giant's Strength", type: "potion", category: "basic", size: b_potionSizes[3], buff: "Giant's Strength"},
	{id: 2164, name: "Legendary Potion of Giant's Strength", type: "potion", category: "basic", size: b_potionSizes[4], buff: "Giant's Strength", legendary: true, distillBanned: true},

	// Health basics.
	{id: 13, name: "Small Potion of Heroism", type: "potion", category: "basic", size: b_potionSizes[0], buff: "Heroism"},
	{id: 14, name: "Medium Potion of Heroism", type: "potion", category: "basic", size: b_potionSizes[1], buff: "Heroism"},
	{id: 15, name: "Large Potion of Heroism", type: "potion", category: "basic", size: b_potionSizes[2], buff: "Heroism"},
	{id: 16, name: "Huge Potion of Heroism", type: "potion", category: "basic", size: b_potionSizes[3], buff: "Heroism"},
	{id: 2166, name: "Legendary Potion of Heroism", type: "potion", category: "basic", size: b_potionSizes[4], buff: "Heroism", legendary: true, distillBanned: true},

	// Speed basics.
	{id: 74, name: "Small Potion of Speed", type: "potion", category: "basic", size: b_potionSizes[0], buff: "Speed", distillBanned: true},
	{id: 75, name: "Medium Potion of Speed", type: "potion", category: "basic", size: b_potionSizes[1], buff: "Speed", distillBanned: true},
	{id: 76, name: "Large Potion of Speed", type: "potion", category: "basic", size: b_potionSizes[2], buff: "Speed", distillBanned: true},
	{id: 77, name: "Huge Potion of Speed", type: "potion", category: "basic", size: b_potionSizes[3], buff: "Speed", distillBanned: true},
	{id: 2168, name: "Legendary Potion of Speed", type: "potion", category: "basic", size: b_potionSizes[4], buff: "Speed", legendary: true, distillBanned: true},
	
	// Misc Potions
	{id: 35, name: "Potion of Specialization", type: "potion", category: "spec"},
	{id: 36, name: "Potion of Polish", type: "potion", category: "pop"},
	{id: 1798, name: "Epic Golden Potion", type: "potion", category: "GE", distillBanned: true},

	// 7 Day Potions.
	{id: 1712, name: "Potion of the Hunter", type: "potion", category: "7days"},
	{id: 1721, name: "Potion of the Gold Hunter", type: "potion", category: "7days"},
	{id: 1722, name: "Potion of Psychomorphic Energy", type: "potion", category: "7days"},
	{id: 1723, name: "Potion of the Gem Hunter", type: "potion", category: "7days", distillBanned: true},

	// Blacksmiths.
	{id: 31, name: "Tiny Blacksmithing Contract", type: "contract", category: "blacksmith"},
	{id: 32, name: "Small Blacksmithing Contract", type: "contract", category: "blacksmith"},
	{id: 33, name: "Medium Blacksmithing Contract", type: "contract", category: "blacksmith"},
	{id: 34, name: "Large Blacksmithing Contract", type: "contract", category: "blacksmith"},
	{id: 1797, name: "Huge Blacksmithing Contract", type: "contract", category: "blacksmith"},

	// Bounties.
	{id: 17, name: "Tiny Bounty Contract", type: "contract", category: "bounty"},
	{id: 18, name: "Small Bounty Contract", type: "contract", category: "bounty"},
	{id: 19, name: "Medium Bounty Contract", type: "contract", category: "bounty"},
	{id: 20, name: "Large Bounty Contract", type: "contract", category: "bounty"},
]; // prettier-ignore

// Potion Specific
const b_potionsById = new Map();
const b_potionsByName = new Map();
const b_potionsByCategory = new Map();
const b_potionsBySize = new Map();
const b_potionsByBuff = new Map();
const b_potionsByBuffAndSize = new Map();

for (const buff of b_buffRegistry) {
	if (buff.type === "potion") {
		b_potionsById.set(buff.id, buff);
		b_potionsByName.set(buff.name, buff);

		if (buff.category != null) {
			if (!b_potionsByCategory.has(buff.category))
				b_potionsByCategory.set(buff.category, []);
			b_potionsByCategory.get(buff.category).push(buff);
		}
		if (buff.size != null) {
			if (!b_potionsBySize.has(buff.size))
				b_potionsBySize.set(buff.size, []);
			b_potionsBySize.get(buff.size).push(buff);
		}
		if (buff.buff != null) {
			if (!b_potionsByBuff.has(buff.buff))
				b_potionsByBuff.set(buff.buff, []);
			b_potionsByBuff.get(buff.buff).push(buff);
			if (buff.size != null) {
				if (!b_potionsByBuffAndSize.has(buff.buff))
					b_potionsByBuffAndSize.set(buff.buff, new Map());
				b_potionsByBuffAndSize.get(buff.buff).set(buff.size, buff);
			}
		}
	}
} // prettier-ignore

const b_speedPotionsSortedBySize = [...(b_potionsByBuff.get("Speed") ?? [])];
b_speedPotionsSortedBySize.sort((a, b) => {
	return b_potionSizes.indexOf(a.size) - b_potionSizes.indexOf(b.size);
});
