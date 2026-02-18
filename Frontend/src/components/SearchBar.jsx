import { useState } from "react";
import "./SearchBar.css";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      window.open(data.redirectUrl, "_blank");
    } catch (error) {
      console.error("Erro na busca:", error);
    }
  };

  return (
    <form className="search-container" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder="Digite sua pesquisa..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      <button type="submit" className="search-button">
        🔍 Buscar
      </button>
    </form>
  );
}
