import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Voting DApp</title>
        <meta content="Decentralized Voting Application" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <ConnectButton />

        <h1 className={styles.title}>Welcome to Voting DApp</h1>

        <div className={styles.grid}>
          <Link href="/voting" className={styles.card}>
            <h2>Go to Voting Application &rarr;</h2>
            <p>Start participating in the decentralized voting process.</p>
          </Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Voting DApp - IMT Blockchain Project</p>
      </footer>
    </div>
  );
};

export default Home;
