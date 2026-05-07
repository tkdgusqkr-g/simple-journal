import { redirect } from "@sveltejs/kit";

export const load = ({ params }) => {
  throw redirect(307, `/diary/${params.id}/calendar`);
};
