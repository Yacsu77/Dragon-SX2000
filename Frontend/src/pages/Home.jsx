import SearchBar from "../components/SearchBar";

export default function Home() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Minha Busca Personalizada</h1>
      <SearchBar />
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "linear-gradient(135deg, #1e1e2f, #2c2c54)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
  },
  title: {
    marginBottom: "40px",
  },
};
