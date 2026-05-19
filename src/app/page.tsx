"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { SETUP_PHASE } from "@/lib/example";
import { FEATURE_PLACEHOLDER } from "@/features/example";
import { COMPONENT_PLACEHOLDER } from "@/components/example";
import type { SetupPhase } from "@/types/example";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * T-003 smoke-test page.
 *
 * Renders one instance of each of the 18 shadcn/ui primitives installed on
 * this branch. The four `@/`-alias stubs from T-001 are still referenced so
 * `tsc --noEmit` keeps every alias exercised. The page is intentionally a
 * client component because Dialog, DropdownMenu, Form, RadioGroup, Select,
 * Tabs, Tooltip and Sonner all rely on client-side state.
 */

const demoSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen."),
});

type DemoFormValues = z.infer<typeof demoSchema>;

export default function Home() {
  const phase: SetupPhase = "T-002";
  // T-001 alias stub proof — keep every `@/*` path in tsconfig exercised.
  const aliasProof = `${SETUP_PHASE} · ${FEATURE_PLACEHOLDER} · ${COMPONENT_PLACEHOLDER}`;

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: DemoFormValues) => {
    toast.success(`Hallo, ${values.name}!`);
  };

  return (
    <main className="bg-background text-foreground mx-auto min-h-screen max-w-5xl space-y-12 p-12">
      <header className="space-y-2">
        <h1 className="text-forest-green font-heading text-4xl">
          GreenScout · UI primitive smoke test
        </h1>
        <p className="text-muted-foreground">
          T-003: 18 shadcn/ui-Primitive installiert und an die Marken-Tokens
          gebunden. Phase {phase}.
        </p>
        <p className="sr-only" aria-hidden="true">
          {aliasProof}
        </p>
      </header>

      <Separator />

      {/* ----- Forms ----- */}
      <section aria-labelledby="forms-heading" className="space-y-6">
        <h2
          id="forms-heading"
          className="text-forest-green font-heading text-2xl"
        >
          Formulare
        </h2>

        <div className="flex flex-wrap gap-3">
          <Button>Primär</Button>
          <Button variant="secondary">Sekundär</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Löschen</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Kundenname</Label>
            <Input id="demo-input" placeholder="z.B. Hofgut Sonnenwiese" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-select">Region</Label>
            <Select>
              <SelectTrigger id="demo-select">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nord">Nord</SelectItem>
                <SelectItem value="mitte">Mitte</SelectItem>
                <SelectItem value="sued">Süd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="demo-checkbox" />
            <Label htmlFor="demo-checkbox">DSGVO bestätigt</Label>
          </div>

          <RadioGroup defaultValue="wizard" className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem id="demo-radio-wizard" value="wizard" />
              <Label htmlFor="demo-radio-wizard">Wizard-Modus</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="demo-radio-single" value="single" />
              <Label htmlFor="demo-radio-single">Einseitenformular</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="demo-textarea">Notizen</Label>
            <Textarea
              id="demo-textarea"
              placeholder="Interne Anmerkungen für das Beratungsteam …"
              rows={3}
            />
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="border-border bg-card rounded-md border p-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (RHF + zod)</FormLabel>
                  <FormControl>
                    <Input placeholder="Vorname Nachname" {...field} />
                  </FormControl>
                  <FormDescription>
                    Wird per Sonner-Toast bestätigt.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-4">
              <Button type="submit">Absenden</Button>
            </div>
          </form>
        </Form>
      </section>

      <Separator />

      {/* ----- Overlays ----- */}
      <section aria-labelledby="overlays-heading" className="space-y-6">
        <h2
          id="overlays-heading"
          className="text-forest-green font-heading text-2xl"
        >
          Overlays
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog öffnen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Beispiel-Dialog</DialogTitle>
                <DialogDescription>
                  Modale Bestätigungs- und Detailansichten nutzen dieses
                  Primitive.
                </DialogDescription>
              </DialogHeader>
              <p className="text-muted-foreground text-sm">
                Hier könnte z.B. die Detailansicht einer Studie stehen.
              </p>
              <DialogFooter>
                <Button variant="ghost">Abbrechen</Button>
                <Button>Weiter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Aktionen</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Studie</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
              <DropdownMenuItem>Duplizieren</DropdownMenuItem>
              <DropdownMenuItem>Archivieren</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover für Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>
              Tooltip erläutert kontextuelle Aktionen.
            </TooltipContent>
          </Tooltip>
        </div>
      </section>

      <Separator />

      {/* ----- Data display ----- */}
      <section aria-labelledby="data-heading" className="space-y-6">
        <h2
          id="data-heading"
          className="text-forest-green font-heading text-2xl"
        >
          Datenanzeige
        </h2>

        <Card>
          <CardHeader>
            <CardTitle>Card-Beispiel</CardTitle>
            <CardDescription>
              Container für Studien-Zusammenfassungen und Listen-Items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Sekundär</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Achtung</Badge>
            </div>

            <Tabs defaultValue="kennzahlen">
              <TabsList>
                <TabsTrigger value="kennzahlen">Kennzahlen</TabsTrigger>
                <TabsTrigger value="historie">Historie</TabsTrigger>
              </TabsList>
              <TabsContent value="kennzahlen" className="pt-3">
                <Table>
                  <TableCaption>Beispielhafte PV-Kennzahlen.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead className="tabular-nums text-right">
                        Wert
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Anlage</TableCell>
                      <TableCell className="tabular-nums text-right">
                        120,00 kWp
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Erzeugung</TableCell>
                      <TableCell className="tabular-nums text-right">
                        118.500 kWh/a
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pacht</TableCell>
                      <TableCell className="tabular-nums text-right">
                        27.500 €
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="historie" className="pt-3">
                <p className="text-muted-foreground text-sm">
                  Hier würde die Versionshistorie der Studie erscheinen.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ----- Feedback ----- */}
      <section aria-labelledby="feedback-heading" className="space-y-6">
        <h2
          id="feedback-heading"
          className="text-forest-green font-heading text-2xl"
        >
          Feedback
        </h2>

        <Alert>
          <AlertTitle>Standard-Hinweis</AlertTitle>
          <AlertDescription>
            Neutrale Information für die Beratenden, z.B. nach dem Speichern.
          </AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <AlertTitle>Validierungsfehler</AlertTitle>
          <AlertDescription>
            Das Formular enthält Felder mit ungültigen Werten.
          </AlertDescription>
        </Alert>

        <div>
          <Button
            variant="secondary"
            onClick={() => toast.success("Toast über Sonner ausgelöst.")}
          >
            Sonner-Toast auslösen
          </Button>
        </div>
      </section>
    </main>
  );
}
