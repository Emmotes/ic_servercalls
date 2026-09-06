const vr = 1.000; // prettier-ignore
const r_rarityRegistry = [
	{rarity: 1, name: "Common", colour: "var(--WhitecapFoam)"},
	{rarity: 2, name: "Uncommon", colour: "var(--AlienArmpit)"},
	{rarity: 3, name: "Rare", colour: "var(--UltramarineBlue)"},
	{rarity: 4, name: "Epic", colour: "var(--Violet)"},
	{rarity: 5, name: "Legendary", colour: "var(--Saffron)"},
];
const r_rarityById = new Map();
const r_nameById = new Map();
const r_colourById = new Map();

for (const rarityType of r_rarityRegistry) {
	r_rarityById.set(rarityType.rarity, rarityType);
	r_nameById.set(rarityType.rarity, rarityType.name);
	r_colourById.set(rarityType.rarity, rarityType.colour);
}
