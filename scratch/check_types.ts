import { createTeacherInputSchema } from "../../packages/types/src/teacher.js";
import { z } from "zod";

type Input = z.infer<typeof createTeacherInputSchema>;
const testInput: Input = {
  full_name: "Test",
  branch: "Math",
  email: "test@example.com",
  phone: "+905551234567",
  status: "active"
};

console.log("Types evaluated successfully, email is:", testInput.email);
