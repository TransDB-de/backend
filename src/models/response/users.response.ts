import { DatabaseUser } from "../../models/database/user.model.js"


export type PublicUser = Pick< DatabaseUser<"out">, "username" | "email" | "registerDate" | "lastLogin" | "admin">
