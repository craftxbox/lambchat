const blacklist = [
    atob("NGNkbi5vcmc="), // unsavoury clover
    atob("NGNoYW4ub3Jn"), // ditto
    atob("OGt1bi50b3A="), // no idea what this is but copilot suggested it so it's probably bad
    atob("a2l3aS4/ZmFybXM/"), // forbidden fruit
    atob("XGJmYWd8ZmFnXGJ8ZmFnZ290"), // f slur
    atob("bmlnKyhhfGVyfGxldCk="), // n word
    atob("dHJhbisoeXxpZSk="), // t slur
    atob("a2kra2U="), // religious slur
    atob("dHIrb3syLH1u"), // t slur (the other one)
    atob("KG1hcHxhYW0pLj8ocHJpZGV8c2V4dWFsKQ=="), //nonce
    atob("XGJsbytsaSs="), //nonce (of the anime variety)
    atob("XGJzaG8rcj90YQ=="), //nonce (of the anime variety)
    atob("Y3Vubnk="), //nonce
    atob("KHBlZG98em9vKXBoaWwoaWF8ZSk="), //nonce + zeta
    atob("em9vLj8ocHJpZGV8c2V4dWFsKQ=="), //zeta
    "\u03b6|\u0396", // literally zeta
    "anondrop",
];

export function checkBlacklist(contents: string) {
    for (let i of blacklist) {
        if (contents.match(new RegExp(i, "i"))) return true;
    }
}
