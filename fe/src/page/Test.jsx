import { useState, useEffect } from "react";
import supabase from "../utils/supabase";

function Test() {
  const [product, setProduct] = useState([]);

  useEffect(() => {
    async function getTodos() {
      let { data: product, error } = await supabase.from("product").select();

      if (error) {
        console.error(error);
      }
      setProduct(product);
    }
    getTodos();
  }, []);
  console.log(product);
  return <div>hello</div>;
}
export default Test;
