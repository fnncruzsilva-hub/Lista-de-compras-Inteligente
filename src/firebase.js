import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3W3SG5RdPBeSHDSKB4qtZVvGuctERMxI",
  authDomain: "listou-app-5535f.firebaseapp.com",
  projectId: "listou-app-5535f",
  storageBucket: "listou-app-5535f.firebasestorage.app",
  messagingSenderId: "221502013994",
  appId: "1:221502013994:web:25a35708c1fbec65f67953"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Criar pedido
export async function criarPedido(cliente, valor) {
  const ref = await addDoc(collection(db, "pedidos"), {
    cliente,
    valor,
    status: "aberto",
    data: new Date()
  });
  return ref.id;
}

// Concluir pedido
export async function concluirPedido(id) {
  await updateDoc(doc(db, "pedidos", id), {
    status: "concluido"
  });
}