import type { Metadata } from "next";

import { NewCourseForm } from "./new-course-form";

export const metadata: Metadata = { title: "Nuevo curso" };

export default function NewCoursePage() {
  return (
    <div className="grid max-w-xl gap-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo curso</h1>
        <p className="text-muted-foreground mt-1">
          Empezá con el título. Después completás el resto de los datos y el temario.
        </p>
      </div>
      <NewCourseForm />
    </div>
  );
}
