const vr = 1.001; // prettier-ignore
const r_rarityRegistry = [
	{rarity: 1, name: "Common", colour: "var(--WhitecapFoam)"},
	{rarity: 2, name: "Uncommon", colour: "var(--Leafy)"},
	{rarity: 3, name: "Rare", colour: "var(--CornflowerBlue)"},
	{rarity: 4, name: "Epic", colour: "var(--Heliotrope)"},
	{rarity: 5, name: "Legendary", colour: "var(--Orange)"},
];
const r_rarityById = new Map();
const r_nameById = new Map();
const r_colourById = new Map();

for (const rarityType of r_rarityRegistry) {
	r_rarityById.set(rarityType.rarity, rarityType);
	r_nameById.set(rarityType.rarity, rarityType.name);
	r_colourById.set(rarityType.rarity, rarityType.colour);
}
