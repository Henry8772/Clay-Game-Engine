
import React from 'react';

export const INITIAL_STATE = {"meta":{"turnCount":1,"activePlayerId":"p1","phase":"setup","vars":{}},"zones":{"conveyor":{"type":"grid","visibility":"public","ownerId":null},"kitchen":{"type":"set","visibility":"public","ownerId":"p1"}},"entities":{"chef_1":{"t":"chef","loc":"kitchen","pos":1,"owner":"p1","props":{"level":1}},"tuna_1":{"t":"tuna","loc":"conveyor","pos":0,"owner":"cpu","props":{"hp":10}}}};
export const BLUEPRINTS = {"chef":{"id":"chef","name":"Sushi Chef","renderType":"ASSET","description":"The main tower that throws knives","visualPrompt":"A pixel art sushi chef in white uniform holding a knife","baseStats":{"cost":50,"damage":10}},"tuna":{"id":"tuna","name":"Tuna Roll","renderType":"ASSET","description":"Basic enemy unit","visualPrompt":"A pixel art tuna sushi roll with angry eyes","baseStats":{"speed":1,"reward":5}}};
export const GAME_RULES = "Mock Rules";
export const ASSET_MAP = {
  "chef": "/generated-assets/chef.png",
  "tuna": "/generated-assets/tuna.png"
};

export function Game() {
  return <div>Mock Game</div>;
}
