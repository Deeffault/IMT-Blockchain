# IMT-Blockchain

Groupe : Théo LEBRIEZ (info), William PEREIRA (info), Auguste MAILLARD (télécom)

Promotion : FISA TI 2027

## Démonstration Vidéo :

<video src="https://user-images.githubusercontent.com/Deeffault/IMT-Blockchain
/assets/demo.mp4" controls="controls" style="max-width: 730px;"></video>


## Installation : 
```bash
git clone https://github.com/Deeffault/IMT-Blockchain.git
```

Puis : 
```bash
cd IMT-Blockchain
```

## Lancer le projet : 
### backend
Dans un terminal, lancez les commandes suivantes :
```bash
cd backend
npm install
npx hardhat compile
npx hardhat node
```

Dans un second terminal (ne quittez pas le premier), lancez les commandes suivantes :
```bash
cd backend
npx hardhat run ignition/modules/deploy.ts --network localhost
```

Remplacez localhost par sepolia si vous voulez déployer votre contrat sur ce réseau. Enregistrez l'adresse (locale ou autre) où le contrat a été déployé.

Créez un fichier `.env` dans le répertoire `backend` et dans `frontend`.
```
SEPOLIA_RPC_URL= # Alchemy API Key
PRIVATE_KEY= # Metamask private Key
ETHERSCAN_API_KEY= # Etherscan API Key
NEXT_PUBLIC_ENABLE_TESTNETS= #adresse du contract
```
L'adresse du contrat doit être attribuée à `NEXT_PUBLIC_ENABLE_TESTNETS`.

### frontend
Dans un terminal (ne fermez pas celui qui a lancé la commande `npx hardhat node`), lancez les commandes suivantes :
```bash
cd frontend
npm install
npm run dev
```

Votre application sera accessible sur `http://localhost:3000/`.

Si vous voulez relancer de zéro le déroulement des votes, fermez tous les terminaux, et relancez ces commandes.

## Tests :
Pour lancer les tests de cette application, lancez ces commandes dans votre terminal :
```bash
cd backend
npx hardhat compile
npx hardhat test
```

<video src="https://user-images.githubusercontent.com/Deeffault/IMT-Blockchain
/assets/tests.mp4" controls="controls" style="max-width: 730px;"></video>

## Structure du projet
```
IMT-Blockchain/
├── backend/
│   ├── contracts/          # Contrats intelligents Solidity
│   ├── ignition/           # Configuration de déploiement
│   └── test/               # Tests des contrats
├── frontend/
│   ├── components/         # Composants UI
│   ├── hooks/              # Hooks pour interagir avec le contrat
│   ├── pages/              # Pages de l'application
│   └── styles/             # Ressources statiques pour le css
│   └── utils/              # Ressources pour l'ABI du contract solidity
├── assets/                 # Vidéos
└── README.md
```

## Fonctionnalités supplémentaires :

- Délégation de vote : si vous renseignez l'adresse d'un votant valide, vous lui donnez votre voix. Ainsi, au lieu d'incrémenter le compteur de voix de 1, vous l'augmentez de 2.
- Achat de voix : en utilisant des `wei`, vous pouvez augmenter les voix de la proposition pour laquelle vous votez par 1 + nombre de `wei` dépensés.