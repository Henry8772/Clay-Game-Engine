import React from 'react';

// Define types for the initial state
interface Card {
  id: string;
  name: string;
  type: 'minion' | 'spell';
  cost: number;
  text: string;
  attack?: number;
  health?: number;
}

interface Player {
  health: number;
  manaCurrent: number;
  manaMax: number;
  deck: Card[];
  hand: Card[];
  graveyard: Card[];
  board: (Card | null)[];
}

interface GameState {
  players: {
    player1: Player;
    player2: Player;
  };
  activePlayer: 'player1' | 'player2';
  turnPhase: string;
  gameRunning: boolean;
}

// Define AssetMap type
interface AssetMap {
  minion_board_space: string;
  card_text_display: string;
  player_mana_display: string;
  player_hand_area: string;
  icon_shield: string;
  turn_indicator: string;
  card_cost_display: string;
  icon_mana_crystal_filled: string;
  player_graveyard_stack: string;
  game_board_background: string;
  player_health_display: string;
  card_attack_display: string;
  minion_card_asset: string;
  icon_sword: string;
  icon_heart: string;
  icon_mana_crystal_empty: string;
  player_deck_count: string;
  card_health_display: string;
  player_graveyard_count: string;
  player_deck_stack: string;
  spell_card_asset: string;
}

// --- Card Components ---

interface MinionCardProps {
  card: Card;
  assetMap: AssetMap;
}

const MinionCard: React.FC<MinionCardProps> = ({ card, assetMap }) => (
  <div style={{
    width: '120px',
    height: '180px',
    border: '1px solid gold',
    borderRadius: '8px',
    backgroundColor: '#333',
    color: 'white',
    margin: '5px',
    position: 'relative',
    backgroundImage: `url(${assetMap.minion_card_asset})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '5px',
    boxSizing: 'border-box'
  }}>
    <div style={{ position: 'absolute', top: '5px', left: '5px', width: '30px', height: '30px', backgroundImage: `url(${assetMap.card_cost_display})`, backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
      {card.cost}
    </div>
    <div style={{ fontWeight: 'bold', textAlign: 'center', marginTop: '35px', fontSize: '0.8em' }}>{card.name}</div>
    <div style={{
      position: 'absolute',
      bottom: '35px',
      left: '5px',
      right: '5px',
      height: '40px',
      backgroundImage: `url(${assetMap.card_text_display})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.6em',
      padding: '0 5px',
      boxSizing: 'border-box'
    }}>
      {card.text}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px 5px 5px' }}>
      <div style={{
        width: '30px',
        height: '30px',
        backgroundImage: `url(${assetMap.card_attack_display})`,
        backgroundSize: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
      }}>
        {card.attack}
      </div>
      <div style={{
        width: '30px',
        height: '30px',
        backgroundImage: `url(${assetMap.card_health_display})`,
        backgroundSize: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
      }}>
        {card.health}
      </div>
    </div>
  </div>
);

interface SpellCardProps {
  card: Card;
  assetMap: AssetMap;
}

const SpellCard: React.FC<SpellCardProps> = ({ card, assetMap }) => (
  <div style={{
    width: '120px',
    height: '180px',
    border: '1px solid blue',
    borderRadius: '8px',
    backgroundColor: '#333',
    color: 'white',
    margin: '5px',
    position: 'relative',
    backgroundImage: `url(${assetMap.spell_card_asset})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '5px',
    boxSizing: 'border-box'
  }}>
    <div style={{ position: 'absolute', top: '5px', left: '5px', width: '30px', height: '30px', backgroundImage: `url(${assetMap.card_cost_display})`, backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
      {card.cost}
    </div>
    <div style={{ fontWeight: 'bold', textAlign: 'center', marginTop: '35px', fontSize: '0.8em' }}>{card.name}</div>
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '5px',
      right: '5px',
      height: '80px', // Spells have more text space
      backgroundImage: `url(${assetMap.card_text_display})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.7em',
      padding: '0 5px',
      boxSizing: 'border-box',
      textAlign: 'center'
    }}>
      {card.text}
    </div>
  </div>
);

interface CardProps {
  card: Card;
  assetMap: AssetMap;
}

const CardComponent: React.FC<CardProps> = ({ card, assetMap }) => {
  if (card.type === 'minion') {
    return <MinionCard card={card} assetMap={assetMap} />;
  } else if (card.type === 'spell') {
    return <SpellCard card={card} assetMap={assetMap} />;
  }
  return null; // Should not happen with current types
};

// --- Player Info Components ---

interface PlayerHealthProps {
  health: number;
  assetMap: AssetMap;
}

const PlayerHealth: React.FC<PlayerHealthProps> = ({ health, assetMap }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '40px',
    backgroundImage: `url(${assetMap.player_health_display})`,
    backgroundSize: 'cover',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.2em',
    position: 'relative'
  }}>
    <img src={assetMap.icon_heart} alt="Health" style={{ width: '25px', height: '25px', marginRight: '5px' }} />
    {health}
  </div>
);

interface PlayerManaProps {
  current: number;
  max: number;
  assetMap: AssetMap;
}

const PlayerMana: React.FC<PlayerManaProps> = ({ current, max, assetMap }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    height: '40px',
    backgroundImage: `url(${assetMap.player_mana_display})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    padding: '0 10px'
  }}>
    {Array.from({ length: max }).map((_, i) => (
      <img
        key={i}
        src={i < current ? assetMap.icon_mana_crystal_filled : assetMap.icon_mana_crystal_empty}
        alt="Mana Crystal"
        style={{ width: '25px', height: '25px' }}
      />
    ))}
  </div>
);

interface PlayerHandProps {
  hand: Card[];
  assetMap: AssetMap;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ hand, assetMap }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: '200px',
    padding: '10px',
    backgroundImage: `url(${assetMap.player_hand_area})`,
    backgroundSize: 'cover',
    borderRadius: '10px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
  }}>
    {hand.map((card, index) => (
      <CardComponent key={card.id + index} card={card} assetMap={assetMap} />
    ))}
  </div>
);

interface DeckGraveyardProps {
  deckCount: number;
  graveyardCount: number;
  assetMap: AssetMap;
}

const DeckGraveyard: React.FC<DeckGraveyardProps> = ({ deckCount, graveyardCount, assetMap }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
    <div style={{ position: 'relative', width: '60px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img src={assetMap.player_deck_stack} alt="Deck" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <span style={{ position: 'absolute', bottom: '-20px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '5px', color: 'white' }}>
        {deckCount}
      </span>
    </div>
    <div style={{ position: 'relative', width: '60px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img src={assetMap.player_graveyard_stack} alt="Graveyard" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <span style={{ position: 'absolute', bottom: '-20px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '5px', color: 'white' }}>
        {graveyardCount}
      </span>
    </div>
  </div>
);

interface MinionBoardSpaceProps {
  minion: Card | null;
  assetMap: AssetMap;
}

const MinionBoardSpace: React.FC<MinionBoardSpaceProps> = ({ minion, assetMap }) => (
  <div style={{
    width: '130px',
    height: '190px',
    border: '2px dashed grey',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundImage: `url(${assetMap.minion_board_space})`,
    backgroundSize: 'cover'
  }}>
    {minion ? <MinionCard card={minion} assetMap={assetMap} /> : <span style={{ color: 'grey', fontSize: '0.8em' }}>Empty</span>}
  </div>
);

interface PlayerBoardProps {
  board: (Card | null)[];
  assetMap: AssetMap;
}

const PlayerBoard: React.FC<PlayerBoardProps> = ({ board, assetMap }) => (
  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
    {board.map((minion, index) => (
      <MinionBoardSpace key={index} minion={minion} assetMap={assetMap} />
    ))}
  </div>
);

interface PlayerAreaProps {
  player: Player;
  isPlayer1: boolean;
  assetMap: AssetMap;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isPlayer1, assetMap }) => {
  const flexDirection = isPlayer1 ? 'column-reverse' : 'column'; // Hand at bottom for P1, top for P2

  return (
    <div style={{
      display: 'flex',
      flexDirection: flexDirection,
      alignItems: 'center',
      gap: '20px',
      width: '100%',
      justifyContent: 'space-between',
      margin: '20px 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <PlayerHealth health={player.health} assetMap={assetMap} />
        <PlayerMana current={player.manaCurrent} max={player.manaMax} assetMap={assetMap} />
      </div>
      <PlayerHand hand={player.hand} assetMap={assetMap} />
      <DeckGraveyard
        deckCount={player.deck.length}
        graveyardCount={player.graveyard.length}
        assetMap={assetMap}
      />
    </div>
  );
};

interface TurnIndicatorProps {
  activePlayer: 'player1' | 'player2';
  assetMap: AssetMap;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ activePlayer, assetMap }) => (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    zIndex: 10
  }}>
    <img
      src={assetMap.turn_indicator}
      alt="Turn"
      style={{
        width: '60px',
        height: '60px',
        transform: activePlayer === 'player1' ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.5s ease-in-out'
      }}
    />
  </div>
);


// --- Main Game Component ---

interface GameProps {
  initialState: GameState;
  assetMap: AssetMap;
}

const Game: React.FC<GameProps> = ({ initialState, assetMap }) => {
  // In a real app, you would use useState for game state
  const state = initialState;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#282c34',
      backgroundImage: `url(${assetMap.game_board_background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Player 2 Area (Top) */}
      <PlayerArea player={state.players.player2} isPlayer1={false} assetMap={assetMap} />

      {/* Game Board */}
      <div style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '80%',
        maxWidth: '1200px',
        position: 'relative'
      }}>
        {/* Player 2's Board */}
        <PlayerBoard board={state.players.player2.board} assetMap={assetMap} />

        {/* Turn Indicator */}
        <TurnIndicator activePlayer={state.activePlayer} assetMap={assetMap} />

        {/* Player 1's Board */}
        <PlayerBoard board={state.players.player1.board} assetMap={assetMap} />
      </div>

      {/* Player 1 Area (Bottom) */}
      <PlayerArea player={state.players.player1} isPlayer1={true} assetMap={assetMap} />
    </div>
  );
};

export default Game;


export const ASSET_MAP = {
  "minion_board_space": "/generated-assets/minion_board_space.png",
  "card_text_display": "/generated-assets/card_text_display.png",
  "player_mana_display": "/generated-assets/player_mana_display.png",
  "player_hand_area": "/generated-assets/player_hand_area.png",
  "icon_shield": "/generated-assets/icon_shield.png",
  "turn_indicator": "/generated-assets/turn_indicator.png",
  "card_cost_display": "/generated-assets/card_cost_display.png",
  "icon_mana_crystal_filled": "/generated-assets/icon_mana_crystal_filled.png",
  "player_graveyard_stack": "/generated-assets/player_graveyard_stack.png",
  "game_board_background": "/generated-assets/game_board_background.png",
  "player_health_display": "/generated-assets/player_health_display.png",
  "card_attack_display": "/generated-assets/card_attack_display.png",
  "minion_card_asset": "/generated-assets/minion_card_asset.png",
  "icon_sword": "/generated-assets/icon_sword.png",
  "icon_heart": "/generated-assets/icon_heart.png",
  "icon_mana_crystal_empty": "/generated-assets/icon_mana_crystal_empty.png",
  "player_deck_count": "/generated-assets/player_deck_count.png",
  "card_health_display": "/generated-assets/card_health_display.png",
  "player_graveyard_count": "/generated-assets/player_graveyard_count.png",
  "player_deck_stack": "/generated-assets/player_deck_stack.png",
  "spell_card_asset": "/generated-assets/spell_card_asset.png"
};
